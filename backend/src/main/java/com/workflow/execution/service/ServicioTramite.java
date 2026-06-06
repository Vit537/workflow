package com.workflow.execution.service;

import com.workflow.consulta.model.Consulta;
import com.workflow.consulta.repository.ConsultaRepository;
import com.workflow.execution.dto.RespuestaPaso;
import com.workflow.execution.dto.RespuestaPasoCliente;
import com.workflow.execution.dto.RespuestaTramite;
import com.workflow.execution.dto.SolicitudCompletarPaso;
import com.workflow.execution.dto.SolicitudCrearTramite;
import com.workflow.execution.model.EstadoPaso;
import com.workflow.execution.model.EstadoTramite;
import com.workflow.execution.model.PasoTramite;
import com.workflow.execution.model.Tramite;
import com.workflow.execution.repository.TramiteRepository;
import com.workflow.policy.model.Carril;
import com.workflow.policy.model.Conexion;
import com.workflow.policy.model.Nodo;
import com.workflow.policy.model.Politica;
import com.workflow.policy.model.TipoFlujo;
import com.workflow.policy.model.TipoNodo;
import com.workflow.policy.repository.PoliticaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ServicioTramite {

  private final TramiteRepository tramiteRepository;
  private final PoliticaRepository politicaRepository;
  private final ConsultaRepository consultaRepository;
  private final SimpMessagingTemplate mensajeria;
  private final com.workflow.document.service.ServicioDocumento servicioDocumento;

  public RespuestaTramite crearTramite(SolicitudCrearTramite solicitud, String correoIniciador) {
    Politica politica = politicaRepository.findById(solicitud.getPoliticaId())
        .orElseThrow(() -> new RuntimeException("Política no encontrada"));

    if (politica.getEstado().name().equals("BORRADOR")) {
      throw new RuntimeException("Solo se pueden iniciar trámites de políticas publicadas");
    }

    List<PasoTramite> pasos = construirPasos(politica);

    Tramite tramite = Tramite.builder()
        .politicaId(politica.getId())
        .nombrePolitica(politica.getNombre())
        .iniciadoPor(correoIniciador)
        .consultaId(solicitud.getConsultaId())
        .estado(EstadoTramite.ACTIVO)
        .pasos(pasos)
        .build();

    Tramite guardado = tramiteRepository.save(tramite);
    RespuestaTramite respuesta = mapearARespuesta(guardado);

    // Notificar en tiempo real a todos los asesores conectados (CU-12)
    mensajeria.convertAndSend("/topic/actividades", respuesta);

    return respuesta;
  }

  public List<RespuestaTramite> listarTramitesActivos() {
    List<Tramite> tramites = tramiteRepository.findByEstado(EstadoTramite.ACTIVO);
    Map<String, Politica> politicas = cargarPoliticasEnLote(tramites);
    return tramites.stream()
        .map(t -> mapearARespuestaConConsulta(t, null, politicas.get(t.getPoliticaId())))
        .collect(Collectors.toList());
  }

  public List<RespuestaTramite> listarTramitesPorAsesor(String correo) {
    // Devuelve todos los trámites activos con al menos un paso no completado,
    // enriquecidos con los datos del cliente de la consulta vinculada.
    List<Tramite> tramites = tramiteRepository.findByEstado(EstadoTramite.ACTIVO).stream()
        .filter(t -> t.getPasos().stream()
            .anyMatch(p -> p.getEstado() != EstadoPaso.COMPLETADO))
        .collect(Collectors.toList());

    // Precarga políticas y consultas en lote para evitar N+1 (clave con latencia de Atlas).
    Map<String, Politica> politicas = cargarPoliticasEnLote(tramites);
    Map<String, Consulta> consultasPorTramite = cargarConsultasEnLote(tramites);

    return tramites.stream()
        .map(t -> mapearARespuestaConConsulta(
            t, consultasPorTramite.get(t.getId()), politicas.get(t.getPoliticaId())))
        .collect(Collectors.toList());
  }

  /** Carga en una sola consulta las políticas distintas de un conjunto de trámites. */
  private Map<String, Politica> cargarPoliticasEnLote(List<Tramite> tramites) {
    List<String> ids = tramites.stream()
        .map(Tramite::getPoliticaId)
        .filter(java.util.Objects::nonNull)
        .distinct()
        .collect(Collectors.toList());
    Map<String, Politica> mapa = new HashMap<>();
    politicaRepository.findAllById(ids).forEach(p -> mapa.put(p.getId(), p));
    return mapa;
  }

  /** Carga en una sola consulta las consultas vinculadas (por consultaId) de los trámites. */
  private Map<String, Consulta> cargarConsultasEnLote(List<Tramite> tramites) {
    List<String> consultaIds = tramites.stream()
        .map(Tramite::getConsultaId)
        .filter(java.util.Objects::nonNull)
        .distinct()
        .collect(Collectors.toList());
    Map<String, Consulta> porId = new HashMap<>();
    consultaRepository.findAllById(consultaIds).forEach(c -> porId.put(c.getId(), c));

    // Indexa por tramiteId; para trámites sin consultaId, usa el fallback puntual.
    Map<String, Consulta> porTramite = new HashMap<>();
    for (Tramite t : tramites) {
      Consulta c = t.getConsultaId() != null ? porId.get(t.getConsultaId()) : null;
      if (c == null) {
        c = consultaRepository.findByTramiteId(t.getId()).orElse(null);
      }
      if (c != null) porTramite.put(t.getId(), c);
    }
    return porTramite;
  }

  private List<PasoTramite> construirPasos(Politica politica) {
    return politica.getNodos().stream()
        .filter(n -> n.getTipo() != TipoNodo.INICIO && n.getTipo() != TipoNodo.FIN)
        .map(n -> {
          String nombreCarril = resolverNombreCarril(politica, n);
          return PasoTramite.builder()
              .nodoId(n.getId())
              .etiquetaNodo(n.getEtiqueta())
              .carrilNombre(nombreCarril)
              .tipoNodo(n.getTipo())
              .estado(EstadoPaso.PENDIENTE)
              .asignadoEn(Instant.now())
              .build();
        })
        .collect(Collectors.toList());
  }

  private String resolverNombreCarril(Politica politica, Nodo nodo) {
    return politica.getCarriles().stream()
        .filter(c -> c.getId().equals(nodo.getCarrilId()))
        .map(Carril::getNombre)
        .findFirst()
        .orElse("Sin departamento");
  }

  /** Mapeo básico sin datos de consulta (uso interno). */
  private RespuestaTramite mapearARespuesta(Tramite tramite) {
    return mapearARespuestaConConsulta(tramite, null);
  }

  /** Mapeo enriquecido: busca la consulta vinculada y agrega datos del cliente. */
  private RespuestaTramite mapearARespuestaEnriquecida(Tramite tramite) {
    Consulta consulta = null;
    if (tramite.getConsultaId() != null) {
      consulta = consultaRepository.findById(tramite.getConsultaId()).orElse(null);
    } else {
      // Fallback: buscar por tramiteId en consultas (datos históricos sin consultaId)
      consulta = consultaRepository.findByTramiteId(tramite.getId()).orElse(null);
    }
    return mapearARespuestaConConsulta(tramite, consulta);
  }

  /** Para usos de un solo trámite: resuelve la política con una lectura puntual. */
  private RespuestaTramite mapearARespuestaConConsulta(Tramite tramite, Consulta consulta) {
    Politica politica = null;
    try {
      politica = politicaRepository.findById(tramite.getPoliticaId()).orElse(null);
    } catch (Exception ignored) { /* Política eliminada */ }
    return mapearARespuestaConConsulta(tramite, consulta, politica);
  }

  /** Variante con la política ya resuelta (usada por los listados con precarga en lote). */
  private RespuestaTramite mapearARespuestaConConsulta(Tramite tramite, Consulta consulta, Politica politica) {
    // Índice nodoId → Formulario para exponer el formulario de cada paso sin lecturas repetidas.
    Map<String, com.workflow.policy.model.Formulario> formulariosPorNodo = new HashMap<>();
    if (politica != null && politica.getNodos() != null) {
      politica.getNodos().forEach(n -> {
        if (n.getFormulario() != null) formulariosPorNodo.put(n.getId(), n.getFormulario());
      });
    }

    List<RespuestaPaso> pasos = tramite.getPasos().stream()
        .map(p -> RespuestaPaso.builder()
            .nodoId(p.getNodoId())
            .etiquetaNodo(p.getEtiquetaNodo())
            .carrilNombre(p.getCarrilNombre())
            .asignadoA(p.getAsignadoA())
            .estado(p.getEstado())
            .asignadoEn(p.getAsignadoEn())
            .completadoEn(p.getCompletadoEn())
            .datosFormulario(p.getDatosFormulario())
            .formulario(formulariosPorNodo.get(p.getNodoId()))
            .build())
        .collect(Collectors.toList());

    RespuestaTramite.RespuestaTramiteBuilder builder = RespuestaTramite.builder()
        .id(tramite.getId())
        .politicaId(tramite.getPoliticaId())
        .consultaId(tramite.getConsultaId());

    if (consulta != null) {
      builder.clienteNombre(consulta.getClienteNombre())
             .clienteCorreo(consulta.getClienteCorreo())
             .descripcionConsulta(consulta.getDescripcion());
    }

    return builder
        .nombrePolitica(tramite.getNombrePolitica())
        .iniciadoPor(tramite.getIniciadoPor())
        .estado(tramite.getEstado())
        .pasos(pasos)
        .iniciadoEn(tramite.getIniciadoEn())
        .finalizadoEn(tramite.getFinalizadoEn())
        .build();
  }

  // ── CU-13 ─────────────────────────────────────────────────────────────

  public RespuestaTramite obtenerTramite(String tramiteId) {
    Tramite tramite = tramiteRepository.findById(tramiteId)
        .orElseThrow(() -> new RuntimeException("Trámite no encontrado"));
    return mapearARespuestaEnriquecida(tramite);
  }

  /**
   * CU-12/13: Cambia el estado de un paso manualmente (PENDIENTE/EN_PROGRESO/BLOQUEADO)
   * sin avanzar el motor de flujo. Para completar y avanzar, usar completarPaso().
   */
  public RespuestaTramite cambiarEstadoPaso(String tramiteId, String nodoId, EstadoPaso nuevoEstado) {
    if (nuevoEstado == EstadoPaso.COMPLETADO) {
      throw new RuntimeException("Para completar un paso usa POST /completar — este endpoint solo permite PENDIENTE, EN_PROGRESO o BLOQUEADO");
    }

    Tramite tramite = tramiteRepository.findById(tramiteId)
        .orElseThrow(() -> new RuntimeException("Trámite no encontrado"));

    if (tramite.getEstado() != EstadoTramite.ACTIVO) {
      throw new RuntimeException("El trámite no está activo");
    }

    PasoTramite paso = tramite.getPasos().stream()
        .filter(p -> p.getNodoId().equals(nodoId))
        .findFirst()
        .orElseThrow(() -> new RuntimeException("Paso no encontrado en el trámite"));

    paso.setEstado(nuevoEstado);
    tramiteRepository.save(tramite);

    RespuestaTramite respuesta = mapearARespuestaEnriquecida(tramite);
    mensajeria.convertAndSend("/topic/actividades", respuesta);
    return respuesta;
  }

  // ── Cliente: vista reducida de su paso actual ─────────────────────────

  /**
   * Retorna únicamente el paso activo actual del cliente (EN_PROGRESO o el primero PENDIENTE).
   * Incluye la definición del formulario desde la política para que el cliente sepa qué llenar.
   */
  public RespuestaPasoCliente obtenerPasoActualCliente(String tramiteId) {
    Tramite tramite = tramiteRepository.findById(tramiteId)
        .orElseThrow(() -> new RuntimeException("Trámite no encontrado"));

    List<PasoTramite> pasos = tramite.getPasos();
    int totalPasos = pasos.size();
    long completados = pasos.stream().filter(p -> p.getEstado() == EstadoPaso.COMPLETADO).count();

    if (tramite.getEstado() == EstadoTramite.COMPLETADO) {
      return RespuestaPasoCliente.builder()
          .tramiteCompletado(true)
          .totalPasos(totalPasos)
          .pasosCompletados((int) completados)
          .pasoActualNumero(totalPasos)
          .build();
    }

    PasoTramite pasoActivo = pasos.stream()
        .filter(p -> p.getEstado() == EstadoPaso.EN_PROGRESO)
        .findFirst()
        .orElseGet(() -> pasos.stream()
            .filter(p -> p.getEstado() == EstadoPaso.PENDIENTE)
            .findFirst()
            .orElse(null));

    if (pasoActivo == null) {
      return RespuestaPasoCliente.builder()
          .tramiteCompletado(true)
          .totalPasos(totalPasos)
          .pasosCompletados((int) completados)
          .pasoActualNumero(totalPasos)
          .build();
    }

    int numeroPasoActual = pasos.indexOf(pasoActivo) + 1;

    com.workflow.policy.model.Formulario formulario = null;
    try {
      Politica politica = politicaRepository.findById(tramite.getPoliticaId()).orElse(null);
      if (politica != null) {
        formulario = politica.getNodos().stream()
            .filter(n -> n.getId().equals(pasoActivo.getNodoId()))
            .map(Nodo::getFormulario)
            .findFirst()
            .orElse(null);
      }
    } catch (Exception ignored) { /* Política eliminada */ }

    return RespuestaPasoCliente.builder()
        .nodoId(pasoActivo.getNodoId())
        .departamento(pasoActivo.getCarrilNombre())
        .actividad(pasoActivo.getEtiquetaNodo())
        .estado(pasoActivo.getEstado())
        .formulario(formulario)
        .datosEnviados(pasoActivo.getDatosFormulario())
        .activadoEn(pasoActivo.getAsignadoEn())
        .pasoActualNumero(numeroPasoActual)
        .totalPasos(totalPasos)
        .pasosCompletados((int) completados)
        .tramiteCompletado(false)
        .build();
  }

  /**
   * El cliente envía los datos de su formulario (campos de texto, selección, etc.).
   * Los datos se guardan en el paso y el asesor los ve en tiempo real.
   */
  public RespuestaPasoCliente enviarDatosFormularioCliente(String tramiteId, String nodoId,
      Map<String, Object> datos) {
    Tramite tramite = tramiteRepository.findById(tramiteId)
        .orElseThrow(() -> new RuntimeException("Trámite no encontrado"));

    if (tramite.getEstado() != EstadoTramite.ACTIVO) {
      throw new RuntimeException("El trámite no está activo");
    }

    PasoTramite paso = tramite.getPasos().stream()
        .filter(p -> p.getNodoId().equals(nodoId))
        .findFirst()
        .orElseThrow(() -> new RuntimeException("Paso no encontrado en el trámite"));

    if (paso.getEstado() == EstadoPaso.COMPLETADO) {
      throw new RuntimeException("Este paso ya fue completado");
    }

    Map<String, Object> datosActuales = paso.getDatosFormulario();
    if (datosActuales == null) {
      paso.setDatosFormulario(new java.util.HashMap<>(datos));
    } else {
      datosActuales.putAll(datos);
    }

    tramiteRepository.save(tramite);
    mensajeria.convertAndSend("/topic/actividades", mapearARespuesta(tramite));
    return obtenerPasoActualCliente(tramiteId);
  }

  /**
   * El cliente sube un archivo (foto, documento) para un campo del formulario.
   * El archivo entra al sistema documental versionado (ligado a la política, el nodo y el trámite);
   * en datosFormulario[campo] se guarda el id del documento creado/actualizado.
   */
  public RespuestaPasoCliente subirArchivoCliente(String tramiteId, String nodoId,
      String campo, MultipartFile archivo) throws IOException {

    Tramite tramite = tramiteRepository.findById(tramiteId)
        .orElseThrow(() -> new RuntimeException("Trámite no encontrado"));

    if (tramite.getEstado() != EstadoTramite.ACTIVO) {
      throw new RuntimeException("El trámite no está activo");
    }

    PasoTramite paso = tramite.getPasos().stream()
        .filter(p -> p.getNodoId().equals(nodoId))
        .findFirst()
        .orElseThrow(() -> new RuntimeException("Paso no encontrado en el trámite"));

    if (paso.getEstado() == EstadoPaso.COMPLETADO) {
      throw new RuntimeException("Este paso ya fue completado");
    }

    Map<String, Object> datos = paso.getDatosFormulario();
    if (datos == null) {
      datos = new HashMap<>();
      paso.setDatosFormulario(datos);
    }

    // Si ya había un documento para este campo, se agrega una versión nueva; si no, se crea.
    Object previo = datos.get(campo);
    String documentoIdPrevio = (previo instanceof String s) ? s : null;
    var documento = servicioDocumento.subirComoCliente(
        tramite.getPoliticaId(), nodoId, tramiteId, documentoIdPrevio, archivo);

    datos.put(campo, documento.getId());

    tramiteRepository.save(tramite);
    mensajeria.convertAndSend("/topic/actividades", mapearARespuesta(tramite));
    return obtenerPasoActualCliente(tramiteId);
  }

  public RespuestaTramite completarPaso(String tramiteId, String nodoId,
      SolicitudCompletarPaso solicitud) {

    Tramite tramite = tramiteRepository.findById(tramiteId)
        .orElseThrow(() -> new RuntimeException("Trámite no encontrado"));

    if (tramite.getEstado() != EstadoTramite.ACTIVO) {
      throw new RuntimeException("El trámite no está activo");
    }

    PasoTramite paso = tramite.getPasos().stream()
        .filter(p -> p.getNodoId().equals(nodoId))
        .findFirst()
        .orElseThrow(() -> new RuntimeException("Paso no encontrado en el trámite"));

    // Marcar paso actual como completado
    paso.setEstado(EstadoPaso.COMPLETADO);
    paso.setCompletadoEn(Instant.now());
    if (solicitud.getDatosFormulario() != null) {
      paso.setDatosFormulario(solicitud.getDatosFormulario());
    }

    // Cargar política para navegar el flujo
    Politica politica = politicaRepository.findById(tramite.getPoliticaId())
        .orElseThrow(() -> new RuntimeException("Política no encontrada"));

    Nodo nodoActual = politica.getNodos().stream()
        .filter(n -> n.getId().equals(nodoId))
        .findFirst()
        .orElseThrow(() -> new RuntimeException("Nodo no encontrado en la política"));

    // Motor de flujo: determinar siguientes nodos
    List<Conexion> conexionesSalida = politica.getConexiones().stream()
        .filter(c -> c.getNodoOrigenId().equals(nodoId))
        .collect(Collectors.toList());

    TipoFlujo tipoFlujo = nodoActual.getTipoFlujo() != null ? nodoActual.getTipoFlujo() : TipoFlujo.LINEAL;

    List<String> siguientesNodoIds = resolverSiguientes(tipoFlujo, conexionesSalida,
        solicitud.getCondicionElegida(), politica);

    // Activar los pasos siguientes
    for (String sigNodoId : siguientesNodoIds) {
      Optional<PasoTramite> sigPaso = tramite.getPasos().stream()
          .filter(p -> p.getNodoId().equals(sigNodoId))
          .findFirst();
      sigPaso.ifPresent(p -> {
        if (p.getEstado() == EstadoPaso.PENDIENTE || p.getEstado() == EstadoPaso.BLOQUEADO) {
          p.setEstado(EstadoPaso.EN_PROGRESO);
          p.setAsignadoEn(Instant.now());
        }
      });
    }

    // Verificar si el trámite finalizó (todos los pasos completados o nodo FIN alcanzado)
    boolean finAlcanzado = siguientesNodoIds.stream()
        .anyMatch(id -> politica.getNodos().stream()
            .filter(n -> n.getId().equals(id))
            .anyMatch(n -> n.getTipo() == TipoNodo.FIN));

    boolean todosCompletados = tramite.getPasos().stream()
        .allMatch(p -> p.getEstado() == EstadoPaso.COMPLETADO);

    if (finAlcanzado || todosCompletados) {
      tramite.setEstado(EstadoTramite.COMPLETADO);
      tramite.setFinalizadoEn(Instant.now());
    }

    tramiteRepository.save(tramite);

    RespuestaTramite respuesta = mapearARespuesta(tramite);
    mensajeria.convertAndSend("/topic/actividades", respuesta);
    return respuesta;
  }

  private List<String> resolverSiguientes(TipoFlujo tipoFlujo, List<Conexion> conexiones,
      String condicion, Politica politica) {
    return switch (tipoFlujo) {
      case LINEAL -> conexiones.stream()
          .map(Conexion::getNodoDestinoId)
          .limit(1)
          .collect(Collectors.toList());

      case CONDICIONAL -> {
        List<String> filtrados = conexiones.stream()
            .filter(c -> condicion != null && condicion.equalsIgnoreCase(c.getEtiqueta()))
            .map(Conexion::getNodoDestinoId)
            .collect(Collectors.toList());
        // Si no coincide etiqueta, tomar la primera disponible
        yield filtrados.isEmpty()
            ? conexiones.stream().map(Conexion::getNodoDestinoId).limit(1).collect(Collectors.toList())
            : filtrados;
      }

      case ITERATIVO -> {
        boolean salir = "salir".equalsIgnoreCase(condicion) || "aprobado".equalsIgnoreCase(condicion);
        if (salir) {
          yield conexiones.stream()
              .filter(c -> c.getEtiqueta() != null && !c.getEtiqueta().equalsIgnoreCase("regresar"))
              .map(Conexion::getNodoDestinoId)
              .limit(1)
              .collect(Collectors.toList());
        } else {
          // Regresar: buscar la conexión de retroceso
          yield conexiones.stream()
              .filter(c -> "regresar".equalsIgnoreCase(c.getEtiqueta()))
              .map(Conexion::getNodoDestinoId)
              .limit(1)
              .collect(Collectors.toList());
        }
      }

      case PARALELO -> conexiones.stream()
          .map(Conexion::getNodoDestinoId)
          .collect(Collectors.toList());
    };
  }
}
