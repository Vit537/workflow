package com.workflow.execution.service;

import com.workflow.execution.dto.RespuestaPaso;
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

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServicioTramite {

  private final TramiteRepository tramiteRepository;
  private final PoliticaRepository politicaRepository;
  private final SimpMessagingTemplate mensajeria;

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
    return tramiteRepository.findByEstado(EstadoTramite.ACTIVO)
        .stream()
        .map(this::mapearARespuesta)
        .collect(Collectors.toList());
  }

  public List<RespuestaTramite> listarTramitesPorAsesor(String correo) {
    return tramiteRepository.findByEstado(EstadoTramite.ACTIVO)
        .stream()
        .filter(t -> t.getPasos().stream().anyMatch(
            p -> correo.equals(p.getAsignadoA()) && p.getEstado() != EstadoPaso.COMPLETADO))
        .map(this::mapearARespuesta)
        .collect(Collectors.toList());
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

  private RespuestaTramite mapearARespuesta(Tramite tramite) {
    List<RespuestaPaso> pasos = tramite.getPasos().stream()
        .map(p -> RespuestaPaso.builder()
            .nodoId(p.getNodoId())
            .etiquetaNodo(p.getEtiquetaNodo())
            .carrilNombre(p.getCarrilNombre())
            .asignadoA(p.getAsignadoA())
            .estado(p.getEstado())
            .asignadoEn(p.getAsignadoEn())
            .completadoEn(p.getCompletadoEn())
            .build())
        .collect(Collectors.toList());

    return RespuestaTramite.builder()
        .id(tramite.getId())
        .politicaId(tramite.getPoliticaId())
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
    return mapearARespuesta(tramite);
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
