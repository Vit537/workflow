package com.workflow.document.onlyoffice;

import com.workflow.document.dto.ArchivoDescarga;
import com.workflow.document.model.AccionDocumento;
import com.workflow.document.model.Documento;
import com.workflow.document.model.RolDocumental;
import com.workflow.document.model.VersionDocumento;
import com.workflow.document.onlyoffice.dto.RespuestaConfigOnlyOffice;
import com.workflow.document.repository.DocumentoRepository;
import com.workflow.document.service.ServicioDocumento;
import com.workflow.document.service.ServicioLogDocumento;
import com.workflow.document.service.ServicioPermisosDocumento;
import com.workflow.iam.model.User;
import com.workflow.storage.AlmacenamientoArchivos;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Construye la configuración firmada que necesita el editor OnlyOffice para abrir un documento del DMS.
 *
 * <p>El binario no se incrusta: la config apunta a un endpoint de descarga del backend (protegido por un
 * token corto), y declara el {@code callbackUrl} al que OnlyOffice devolverá el archivo editado (BO5).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ServicioOnlyOffice {

  private final DocumentoRepository documentoRepository;
  private final ServicioPermisosDocumento permisos;
  private final ServicioJwtOnlyOffice jwt;
  private final TokenDescargaDocumento tokenDescarga;
  private final ServicioLogDocumento logs;
  private final OnlyOfficeProperties props;
  private final AlmacenamientoArchivos almacenamiento;
  private final ServicioDocumento servicioDocumento;

  private static final HttpClient HTTP = HttpClient.newHttpClient();

  /**
   * Genera la config para abrir el documento en el editor en vivo.
   *
   * @param documentoId documento a editar
   * @param actor       usuario autenticado (decide edición vs solo lectura)
   * @return config firmada lista para {@code DocsAPI.DocEditor} + metadatos para el front
   */
  public RespuestaConfigOnlyOffice construirConfig(String documentoId, User actor) {
    if (!props.isEnabled()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "La edición en línea está deshabilitada");
    }

    Documento documento = documentoRepository.findById(documentoId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
            "Documento no encontrado: " + documentoId));

    if (documento.getVersionActual() == 0 || documento.getVersiones().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El documento no tiene versiones");
    }

    VersionDocumento version = documento.getVersiones().stream()
        .filter(v -> v.getNumero() == documento.getVersionActual())
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "No se encontró la versión actual"));

    String nombreArchivo = version.getNombreArchivo();
    String documentType = TipoEditorOnlyOffice.documentType(nombreArchivo);
    if (documentType == null) {
      throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
          "Formato no soportado por el editor en línea: " + nombreArchivo);
    }
    String fileType = TipoEditorOnlyOffice.extension(nombreArchivo);

    // ── ¿Edición o solo lectura? ──────────────────────────────────────────
    RolDocumental rol = permisos.rolEfectivo(documento.getPoliticaId(), actor);
    boolean puedeEditar = permisos.puedeEditar(rol);
    boolean formatoEditable = TipoEditorOnlyOffice.esEditable(nombreArchivo);
    boolean bloqueadoPorOtro = documento.getBloqueadoPor() != null
        && actor != null && !documento.getBloqueadoPor().equals(actor.getId());
    boolean modoEdicion = puedeEditar && formatoEditable && !bloqueadoPorOtro;

    // ── URLs que consume OnlyOffice (vuelven al host vía backend-base-url) ──
    String token = tokenDescarga.generar(documentoId);
    String base = props.getBackendBaseUrl().replaceAll("/+$", "");
    String urlContenido = base + "/api/documentos/" + documentoId + "/onlyoffice/contenido?oo=" + token;
    String urlCallback = base + "/api/documentos/" + documentoId + "/onlyoffice/callback?oo=" + token;

    // ── Config para DocsAPI.DocEditor ───────────────────────────────────────
    Map<String, Object> permissions = new LinkedHashMap<>();
    permissions.put("edit", modoEdicion);
    permissions.put("download", true);
    permissions.put("print", true);
    permissions.put("comment", permisos.puedeComentar(rol));

    Map<String, Object> document = new LinkedHashMap<>();
    document.put("fileType", fileType);
    document.put("key", claveDocumento(documento));
    document.put("title", nombreArchivo);
    document.put("url", urlContenido);
    document.put("permissions", permissions);

    Map<String, Object> usuario = new LinkedHashMap<>();
    usuario.put("id", actor != null ? actor.getId() : "anon");
    usuario.put("name", actor != null ? actor.getNombre() : "Invitado");

    Map<String, Object> customization = new LinkedHashMap<>();
    customization.put("forcesave", true); // guarda en cada Ctrl+S sin esperar a cerrar (status 6)

    Map<String, Object> editorConfig = new LinkedHashMap<>();
    editorConfig.put("mode", modoEdicion ? "edit" : "view");
    editorConfig.put("lang", "es");
    editorConfig.put("callbackUrl", urlCallback);
    editorConfig.put("user", usuario);
    editorConfig.put("customization", customization);

    Map<String, Object> config = new LinkedHashMap<>();
    config.put("document", document);
    config.put("documentType", documentType);
    config.put("editorConfig", editorConfig);

    // Firma JWT de OnlyOffice (si hay secreto) sobre el contenido del config.
    String firma = jwt.firmar(config);
    if (firma != null) {
      config.put("token", firma);
    }

    logs.registrar(documentoId, documento.getPoliticaId(), actor,
        AccionDocumento.EDITAR_ONLINE, documento.getVersionActual(),
        modoEdicion ? "Abrió edición en vivo" : "Abrió en solo lectura");

    return new RespuestaConfigOnlyOffice(config, props.getPublicUrl(), modoEdicion, documentType);
  }

  /**
   * Carga el binario de la versión actual para que el Document Server lo descargue.
   * El acceso se autoriza con el token corto de la URL (validado en el controlador).
   */
  public ArchivoDescarga cargarContenidoActual(String documentoId) throws IOException {
    Documento documento = documentoRepository.findById(documentoId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
            "Documento no encontrado: " + documentoId));
    VersionDocumento version = documento.getVersiones().stream()
        .filter(v -> v.getNumero() == documento.getVersionActual())
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "El documento no tiene versiones"));
    return new ArchivoDescarga(
        almacenamiento.cargar(version.getStorageKey()),
        version.getNombreArchivo(),
        version.getTipoMime() != null ? version.getTipoMime() : "application/octet-stream");
  }

  /** Valida el token corto de las URLs expuestas a OnlyOffice. */
  public boolean tokenValido(String token, String documentoId) {
    return tokenDescarga.esValido(token, documentoId);
  }

  /**
   * Procesa el callback del Document Server. Según el {@code status}:
   * <ul>
   *   <li>2 (listo para guardar) / 6 (forcesave): descarga el archivo editado y crea una versión nueva.</li>
   *   <li>1 (editando): marca el documento como "editando en vivo".</li>
   *   <li>4 (cerrado sin cambios): limpia el flag.</li>
   *   <li>otros / errores: solo se registran.</li>
   * </ul>
   *
   * @param authHeader cabecera Authorization de OnlyOffice (puede traer el JWT) — opcional.
   * @throws Exception si falla la descarga/guardado (el controlador responde {@code error:1}).
   */
  public void guardarDesdeCallback(String documentoId, Map<String, Object> body, String authHeader)
      throws Exception {

    Map<String, Object> datos = body;

    // Si la firma está activa, los datos verídicos vienen dentro del JWT (en el cuerpo o en el header).
    if (props.firmaActiva()) {
      String token = (String) body.get("token");
      if (token == null && authHeader != null && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
      if (token == null) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Callback sin firma JWT de OnlyOffice");
      }
      Claims claims = jwt.verificar(token); // lanza si la firma es inválida
      datos = new LinkedHashMap<>(claims);
    }

    int status = ((Number) datos.getOrDefault("status", 0)).intValue();
    Documento documento = documentoRepository.findById(documentoId).orElse(null);
    if (documento == null) {
      log.warn("Callback OnlyOffice para documento inexistente: {}", documentoId);
      return;
    }

    switch (status) {
      case 1 -> marcarEditando(documento, true);
      case 4 -> marcarEditando(documento, false);
      case 2, 6 -> {
        String url = (String) datos.get("url");
        if (url == null || url.isBlank()) {
          throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Callback sin url de descarga");
        }
        guardarVersionEditada(documento, url, datos);
        if (status == 2) marcarEditando(documento, false);
      }
      case 3, 7 -> log.error("OnlyOffice reportó error de guardado (status {}) en doc {}", status, documentoId);
      default -> log.info("Callback OnlyOffice status {} (sin acción) doc {}", status, documentoId);
    }
  }

  /** Descarga el binario editado desde OnlyOffice y crea una versión nueva en el DMS. */
  private void guardarVersionEditada(Documento documento, String url, Map<String, Object> datos)
      throws Exception {
    HttpResponse<byte[]> resp = HTTP.send(
        HttpRequest.newBuilder(URI.create(url)).GET().build(),
        HttpResponse.BodyHandlers.ofByteArray());
    if (resp.statusCode() != 200) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
          "No se pudo descargar el documento editado (HTTP " + resp.statusCode() + ")");
    }

    // Preservar nombre y mime de la versión actual (el formato no cambia al editar).
    VersionDocumento actual = documento.getVersiones().stream()
        .filter(v -> v.getNumero() == documento.getVersionActual())
        .findFirst().orElse(null);
    String nombre = actual != null ? actual.getNombreArchivo() : documento.getNombre();
    String mime = actual != null ? actual.getTipoMime() : "application/octet-stream";

    // Autor: primer editor reportado por OnlyOffice (si lo hay).
    String autorId = null;
    Object users = datos.get("users");
    if (users instanceof List<?> lista && !lista.isEmpty()) {
      autorId = String.valueOf(lista.get(0));
    }

    servicioDocumento.subirVersionDesdeBytes(documento.getId(), resp.body(), nombre, mime,
        "Edición colaborativa OnlyOffice", autorId, "Editor en línea");

    logs.registrar(documento.getId(), documento.getPoliticaId(), null,
        AccionDocumento.GUARDAR_ONLINE, documento.getVersionActual() + 1,
        "Versión guardada desde OnlyOffice");
  }

  private void marcarEditando(Documento documento, boolean editando) {
    if (documento.isEditandoEnVivo() != editando) {
      documento.setEditandoEnVivo(editando);
      documentoRepository.save(documento);
    }
  }

  /**
   * Clave que identifica el estado del documento para OnlyOffice. Debe cambiar cuando cambia el
   * contenido (cada versión nueva), si no el Document Server sirve una copia cacheada.
   */
  static String claveDocumento(Documento documento) {
    return (documento.getId() + "_v" + documento.getVersionActual())
        .replaceAll("[^A-Za-z0-9_-]", "");
  }
}
