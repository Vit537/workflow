package com.workflow.execution.service;

import com.workflow.execution.dto.RespuestaPaso;
import com.workflow.execution.dto.RespuestaTramite;
import com.workflow.execution.dto.SolicitudCrearTramite;
import com.workflow.execution.model.EstadoPaso;
import com.workflow.execution.model.EstadoTramite;
import com.workflow.execution.model.PasoTramite;
import com.workflow.execution.model.Tramite;
import com.workflow.execution.repository.TramiteRepository;
import com.workflow.policy.model.Carril;
import com.workflow.policy.model.Nodo;
import com.workflow.policy.model.Politica;
import com.workflow.policy.model.TipoNodo;
import com.workflow.policy.repository.PoliticaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
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
}
