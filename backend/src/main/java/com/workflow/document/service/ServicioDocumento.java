package com.workflow.document.service;

import com.workflow.document.dto.ArchivoDescarga;
import com.workflow.document.dto.MensajeEventoDocumento;
import com.workflow.document.dto.RespuestaComentario;
import com.workflow.document.dto.RespuestaDocumento;
import com.workflow.document.dto.RespuestaVersion;
import com.workflow.document.model.AccionDocumento;
import com.workflow.document.model.ComentarioDocumento;
import com.workflow.document.model.Documento;
import com.workflow.document.model.EstadoDocumento;
import com.workflow.document.model.VersionDocumento;
import com.workflow.document.onlyoffice.OnlyOfficeProperties;
import com.workflow.document.onlyoffice.TipoEditorOnlyOffice;
import com.workflow.document.repository.DocumentoRepository;
import com.workflow.iam.model.User;
import com.workflow.storage.AlmacenamientoArchivos;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Lógica de negocio del repositorio documental: crear documentos, versionar, listar, descargar,
 * restaurar y archivar. La persistencia binaria se delega en {@link AlmacenamientoArchivos}.
 *
 * <p>Los permisos (B4), la auditoría (B5) y la colaboración en tiempo real (B6) se integran en
 * chunks posteriores.</p>
 */
@Service
@RequiredArgsConstructor
public class ServicioDocumento {

  private final DocumentoRepository documentoRepository;
  private final AlmacenamientoArchivos almacenamiento;
  private final ServicioPermisosDocumento permisos;
  private final ServicioLogDocumento logs;
  private final SimpMessagingTemplate messaging;
  private final OnlyOfficeProperties onlyOfficeProps;

  // ── Crear / versionar ───────────────────────────────────────────────────

  public RespuestaDocumento crearDocumento(String politicaId, String nodoId, String tramiteId,
      String nombre, String descripcion, String notaCambio, MultipartFile archivo, User actor)
      throws IOException {

    permisos.exigirEditar(politicaId, actor);

    Documento documento = Documento.builder()
        .politicaId(politicaId)
        .nodoId(nodoId)
        .tramiteId(tramiteId)
        .nombre(nombre != null && !nombre.isBlank() ? nombre : archivo.getOriginalFilename())
        .descripcion(descripcion)
        .estado(EstadoDocumento.ACTIVO)
        .versionActual(0)
        .creadoPor(actor != null ? actor.getId() : "cliente")
        .creadoPorNombre(actor != null ? actor.getNombre() : "Cliente")
        .build();

    // Persistir primero para obtener el id (necesario para la storageKey).
    documento = documentoRepository.save(documento);

    agregarVersion(documento, archivo, notaCambio, actor);
    documento = documentoRepository.save(documento);
    logs.registrar(documento.getId(), documento.getPoliticaId(), actor,
        AccionDocumento.CREAR, documento.getVersionActual(), documento.getNombre());
    notificar(documento, "NUEVA_VERSION", actor, documento.getNombre());
    return mapearDetalle(documento);
  }

  public RespuestaDocumento subirVersion(String documentoId, String notaCambio,
      MultipartFile archivo, User actor) throws IOException {
    Documento documento = buscar(documentoId);
    permisos.exigirEditar(documento.getPoliticaId(), actor);
    verificarNoBloqueadoPorOtro(documento, actor);
    agregarVersion(documento, archivo, notaCambio, actor);
    documento = documentoRepository.save(documento);
    logs.registrar(documento.getId(), documento.getPoliticaId(), actor,
        AccionDocumento.SUBIR_VERSION, documento.getVersionActual(), notaCambio);
    notificar(documento, "NUEVA_VERSION", actor, notaCambio);
    return mapearDetalle(documento);
  }

  /** Crea una versión nueva inmutable y la añade al documento (no guarda en repo). */
  private void agregarVersion(Documento documento, MultipartFile archivo, String notaCambio,
      User actor) throws IOException {
    int numero = documento.getVersionActual() + 1;
    String ext = obtenerExtension(archivo.getOriginalFilename());
    String key = "politicas/" + documento.getPoliticaId()
        + "/documentos/" + documento.getId()
        + "/v" + numero + "_" + UUID.randomUUID() + ext;

    almacenamiento.guardar(key, archivo);

    VersionDocumento version = VersionDocumento.builder()
        .numero(numero)
        .storageKey(key)
        .nombreArchivo(archivo.getOriginalFilename())
        .tipoMime(archivo.getContentType())
        .tamanoBytes(archivo.getSize())
        .subidoPor(actor != null ? actor.getId() : "cliente")
        .subidoPorNombre(actor != null ? actor.getNombre() : "Cliente")
        .subidoEn(Instant.now())
        .notaCambio(notaCambio)
        .build();

    documento.getVersiones().add(version);
    documento.setVersionActual(numero);
  }

  /**
   * Subida desde el flujo público del cliente (sin usuario autenticado). Si ya existe el documento
   * para ese campo, agrega una versión nueva; si no, crea el documento. Versionado garantizado.
   */
  public RespuestaDocumento subirComoCliente(String politicaId, String nodoId, String tramiteId,
      String documentoIdExistente, MultipartFile archivo) throws IOException {
    if (documentoIdExistente != null && documentoRepository.existsById(documentoIdExistente)) {
      return subirVersion(documentoIdExistente, "Actualización del cliente", archivo, null);
    }
    return crearDocumento(politicaId, nodoId, tramiteId, archivo.getOriginalFilename(),
        "Subido por el cliente", "Versión inicial del cliente", archivo, null);
  }

  /**
   * Crea una versión nueva a partir de bytes crudos (no {@link MultipartFile}). Lo usa la integración
   * con OnlyOffice (BO5): el archivo editado llega por el callback como un binario descargado por HTTP.
   *
   * <p>No exige permiso aquí (ya se validó al abrir el editor) ni registra el log de versión: el
   * llamador (ServicioOnlyOffice) registra la acción {@code GUARDAR_ONLINE}. Sí emite el evento
   * WebSocket {@code NUEVA_VERSION} para que el repositorio refresque.</p>
   */
  public RespuestaDocumento subirVersionDesdeBytes(String documentoId, byte[] contenido,
      String nombreArchivo, String tipoMime, String notaCambio,
      String autorId, String autorNombre) throws IOException {
    Documento documento = buscar(documentoId);

    int numero = documento.getVersionActual() + 1;
    String ext = obtenerExtension(nombreArchivo);
    String key = "politicas/" + documento.getPoliticaId()
        + "/documentos/" + documento.getId()
        + "/v" + numero + "_" + UUID.randomUUID() + ext;

    almacenamiento.guardarBytes(key, contenido);

    VersionDocumento version = VersionDocumento.builder()
        .numero(numero)
        .storageKey(key)
        .nombreArchivo(nombreArchivo)
        .tipoMime(tipoMime)
        .tamanoBytes(contenido.length)
        .subidoPor(autorId != null ? autorId : "onlyoffice")
        .subidoPorNombre(autorNombre != null ? autorNombre : "Editor en línea")
        .subidoEn(Instant.now())
        .notaCambio(notaCambio)
        .build();

    documento.getVersiones().add(version);
    documento.setVersionActual(numero);
    documento = documentoRepository.save(documento);

    messaging.convertAndSend("/topic/documentos/" + documento.getId(),
        new MensajeEventoDocumento(documento.getId(), "NUEVA_VERSION",
            documento.getVersionActual(),
            autorNombre != null ? autorNombre : "Editor en línea", notaCambio));
    return mapearDetalle(documento);
  }

  // ── Restaurar ─────────────────────────────────────────────────────────────

  /**
   * Restaura una versión anterior creando una versión nueva que apunta al mismo binario
   * (las versiones son inmutables, por lo que se comparte la storageKey).
   */
  public RespuestaDocumento restaurarVersion(String documentoId, int numero, User actor) {
    Documento documento = buscar(documentoId);
    permisos.exigirEditar(documento.getPoliticaId(), actor);
    VersionDocumento base = documento.getVersiones().stream()
        .filter(v -> v.getNumero() == numero)
        .findFirst()
        .orElseThrow(() -> new RuntimeException("Versión no encontrada: " + numero));

    int nuevoNumero = documento.getVersionActual() + 1;
    VersionDocumento restaurada = VersionDocumento.builder()
        .numero(nuevoNumero)
        .storageKey(base.getStorageKey())
        .nombreArchivo(base.getNombreArchivo())
        .tipoMime(base.getTipoMime())
        .tamanoBytes(base.getTamanoBytes())
        .subidoPor(actor != null ? actor.getId() : "cliente")
        .subidoPorNombre(actor != null ? actor.getNombre() : "Cliente")
        .subidoEn(Instant.now())
        .notaCambio("Restauración de la versión " + numero)
        .build();

    documento.getVersiones().add(restaurada);
    documento.setVersionActual(nuevoNumero);
    Documento guardado = documentoRepository.save(documento);
    logs.registrar(guardado.getId(), guardado.getPoliticaId(), actor,
        AccionDocumento.RESTAURAR, nuevoNumero, "Restaurada desde v" + numero);
    notificar(guardado, "RESTAURADA", actor, "Restaurada desde v" + numero);
    return mapearDetalle(guardado);
  }

  // ── Comentarios ───────────────────────────────────────────────────────────

  public RespuestaDocumento comentar(String documentoId, String texto, User actor) {
    Documento documento = buscar(documentoId);
    permisos.exigirComentar(documento.getPoliticaId(), actor);

    ComentarioDocumento comentario = ComentarioDocumento.builder()
        .id(UUID.randomUUID().toString())
        .autorId(actor != null ? actor.getId() : "cliente")
        .autorNombre(actor != null ? actor.getNombre() : "Cliente")
        .texto(texto)
        .fecha(Instant.now())
        .build();
    documento.getComentarios().add(comentario);
    documento = documentoRepository.save(documento);

    logs.registrar(documento.getId(), documento.getPoliticaId(), actor,
        AccionDocumento.COMENTAR, documento.getVersionActual(), texto);
    notificar(documento, "COMENTARIO", actor, texto);
    return mapearDetalle(documento);
  }

  // ── Bloqueo (check-out) ───────────────────────────────────────────────────

  public RespuestaDocumento bloquear(String documentoId, User actor) {
    Documento documento = buscar(documentoId);
    permisos.exigirEditar(documento.getPoliticaId(), actor);
    verificarNoBloqueadoPorOtro(documento, actor);

    documento.setBloqueadoPor(actor != null ? actor.getId() : "cliente");
    documento.setBloqueadoPorNombre(actor != null ? actor.getNombre() : "Cliente");
    documento.setBloqueadoEn(Instant.now());
    documento.setEstado(EstadoDocumento.BLOQUEADO);
    documento = documentoRepository.save(documento);

    logs.registrar(documento.getId(), documento.getPoliticaId(), actor,
        AccionDocumento.BLOQUEAR, documento.getVersionActual(), null);
    notificar(documento, "BLOQUEADO", actor, null);
    return mapearDetalle(documento);
  }

  public RespuestaDocumento desbloquear(String documentoId, User actor) {
    Documento documento = buscar(documentoId);
    // El que bloqueó, un PROPIETARIO o un ADMIN pueden liberar.
    boolean esQuienBloqueo = actor != null && actor.getId().equals(documento.getBloqueadoPor());
    if (!esQuienBloqueo) {
      permisos.exigirGestionar(documento.getPoliticaId(), actor);
    }

    documento.setBloqueadoPor(null);
    documento.setBloqueadoPorNombre(null);
    documento.setBloqueadoEn(null);
    documento.setEstado(EstadoDocumento.ACTIVO);
    documento = documentoRepository.save(documento);

    logs.registrar(documento.getId(), documento.getPoliticaId(), actor,
        AccionDocumento.DESBLOQUEAR, documento.getVersionActual(), null);
    notificar(documento, "DESBLOQUEADO", actor, null);
    return mapearDetalle(documento);
  }

  /** Falla si el documento está bloqueado por otra persona distinta del actor. */
  private void verificarNoBloqueadoPorOtro(Documento documento, User actor) {
    String dueno = documento.getBloqueadoPor();
    if (dueno == null) return;
    String actorId = actor != null ? actor.getId() : "cliente";
    if (!dueno.equals(actorId)) {
      throw new AccessDeniedException(
          "El documento está siendo editado por " + documento.getBloqueadoPorNombre());
    }
  }

  /** Difunde un evento de cambio a los suscriptores del documento. */
  private void notificar(Documento documento, String tipo, User actor, String detalle) {
    messaging.convertAndSend("/topic/documentos/" + documento.getId(),
        new MensajeEventoDocumento(
            documento.getId(),
            tipo,
            documento.getVersionActual(),
            actor != null ? actor.getNombre() : "Cliente",
            detalle));
  }

  // ── Listar / obtener ────────────────────────────────────────────────────

  public List<RespuestaDocumento> listarPorPolitica(String politicaId, String nodoId) {
    List<Documento> documentos = (nodoId != null && !nodoId.isBlank())
        ? documentoRepository.findByPoliticaIdAndNodoIdOrderByActualizadoEnDesc(politicaId, nodoId)
        : documentoRepository.findByPoliticaIdOrderByActualizadoEnDesc(politicaId);
    return documentos.stream().map(this::mapearResumen).toList();
  }

  public RespuestaDocumento obtener(String documentoId, User actor) {
    Documento documento = buscar(documentoId);
    logs.registrar(documento.getId(), documento.getPoliticaId(), actor,
        AccionDocumento.VER, documento.getVersionActual(), null);
    return mapearDetalle(documento);
  }

  // ── Descargas ─────────────────────────────────────────────────────────────

  public ArchivoDescarga descargarActual(String documentoId, User actor) throws IOException {
    Documento documento = buscar(documentoId);
    if (documento.getVersionActual() == 0) {
      throw new RuntimeException("El documento no tiene versiones");
    }
    logs.registrar(documento.getId(), documento.getPoliticaId(), actor,
        AccionDocumento.DESCARGAR, documento.getVersionActual(), null);
    return descargar(documento, documento.getVersionActual());
  }

  public ArchivoDescarga descargarVersion(String documentoId, int numero, User actor)
      throws IOException {
    Documento documento = buscar(documentoId);
    logs.registrar(documento.getId(), documento.getPoliticaId(), actor,
        AccionDocumento.DESCARGAR, numero, null);
    return descargar(documento, numero);
  }

  private ArchivoDescarga descargar(Documento documento, int numero) throws IOException {
    VersionDocumento version = documento.getVersiones().stream()
        .filter(v -> v.getNumero() == numero)
        .findFirst()
        .orElseThrow(() -> new RuntimeException("Versión no encontrada: " + numero));
    return new ArchivoDescarga(
        almacenamiento.cargar(version.getStorageKey()),
        version.getNombreArchivo(),
        version.getTipoMime() != null ? version.getTipoMime() : "application/octet-stream");
  }

  // ── Archivar ────────────────────────────────────────────────────────────

  public void archivar(String documentoId, User actor) {
    Documento documento = buscar(documentoId);
    permisos.exigirGestionar(documento.getPoliticaId(), actor);
    documento.setEstado(EstadoDocumento.ARCHIVADO);
    documentoRepository.save(documento);
    logs.registrar(documento.getId(), documento.getPoliticaId(), actor,
        AccionDocumento.ELIMINAR, null, "Documento archivado");
    notificar(documento, "ARCHIVADO", actor, null);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  Documento buscar(String documentoId) {
    return documentoRepository.findById(documentoId)
        .orElseThrow(() -> new RuntimeException("Documento no encontrado: " + documentoId));
  }

  private String obtenerExtension(String nombreOriginal) {
    if (nombreOriginal == null || !nombreOriginal.contains(".")) return "";
    return "." + nombreOriginal.substring(nombreOriginal.lastIndexOf('.') + 1)
        .toLowerCase().replaceAll("[^a-z0-9]", "");
  }

  private RespuestaVersion mapearVersion(VersionDocumento v) {
    return RespuestaVersion.builder()
        .numero(v.getNumero())
        .nombreArchivo(v.getNombreArchivo())
        .tipoMime(v.getTipoMime())
        .tamanoBytes(v.getTamanoBytes())
        .subidoPor(v.getSubidoPor())
        .subidoPorNombre(v.getSubidoPorNombre())
        .subidoEn(v.getSubidoEn())
        .notaCambio(v.getNotaCambio())
        .build();
  }

  /** Resumen para listados: solo la última versión. */
  private RespuestaDocumento mapearResumen(Documento d) {
    return baseRespuesta(d)
        .ultimaVersion(ultimaVersion(d))
        .build();
  }

  /** Detalle: incluye historial completo y comentarios. */
  private RespuestaDocumento mapearDetalle(Documento d) {
    return baseRespuesta(d)
        .ultimaVersion(ultimaVersion(d))
        .versiones(d.getVersiones().stream().map(this::mapearVersion).toList())
        .comentarios(d.getComentarios().stream()
            .map(c -> RespuestaComentario.builder()
                .id(c.getId())
                .autorId(c.getAutorId())
                .autorNombre(c.getAutorNombre())
                .texto(c.getTexto())
                .fecha(c.getFecha())
                .build())
            .toList())
        .build();
  }

  private RespuestaVersion ultimaVersion(Documento d) {
    return d.getVersiones().stream()
        .filter(v -> v.getNumero() == d.getVersionActual())
        .findFirst()
        .map(this::mapearVersion)
        .orElse(null);
  }

  private RespuestaDocumento.RespuestaDocumentoBuilder baseRespuesta(Documento d) {
    String nombreVersion = d.getVersiones().stream()
        .filter(v -> v.getNumero() == d.getVersionActual())
        .findFirst()
        .map(VersionDocumento::getNombreArchivo)
        .orElse(d.getNombre());
    String documentType = TipoEditorOnlyOffice.documentType(nombreVersion);
    boolean editableEnVivo = onlyOfficeProps.isEnabled()
        && TipoEditorOnlyOffice.esEditable(nombreVersion);

    return RespuestaDocumento.builder()
        .id(d.getId())
        .politicaId(d.getPoliticaId())
        .nodoId(d.getNodoId())
        .tramiteId(d.getTramiteId())
        .nombre(d.getNombre())
        .descripcion(d.getDescripcion())
        .estado(d.getEstado())
        .bloqueadoPor(d.getBloqueadoPor())
        .bloqueadoPorNombre(d.getBloqueadoPorNombre())
        .bloqueadoEn(d.getBloqueadoEn())
        .versionActual(d.getVersionActual())
        .editandoEnVivo(d.isEditandoEnVivo())
        .editableEnVivo(editableEnVivo)
        .documentTypeOnlyOffice(onlyOfficeProps.isEnabled() ? documentType : null)
        .creadoPor(d.getCreadoPor())
        .creadoPorNombre(d.getCreadoPorNombre())
        .creadoEn(d.getCreadoEn())
        .actualizadoEn(d.getActualizadoEn());
  }
}
