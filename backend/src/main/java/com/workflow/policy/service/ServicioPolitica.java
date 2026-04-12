package com.workflow.policy.service;

import com.workflow.policy.dto.RespuestaPolitica;
import com.workflow.policy.dto.RespuestaPoliticaResumen;
import com.workflow.policy.dto.SolicitudActualizarDiagrama;
import com.workflow.policy.dto.SolicitudActualizarPolitica;
import com.workflow.policy.dto.SolicitudCrearPolitica;
import com.workflow.policy.model.EstadoPolitica;
import com.workflow.policy.model.Politica;
import com.workflow.policy.repository.PoliticaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServicioPolitica {

  private final PoliticaRepository politicaRepository;

  public List<RespuestaPoliticaResumen> listarPoliticas() {
    return politicaRepository.findAll()
        .stream()
        .map(this::mapearAResumen)
        .collect(Collectors.toList());
  }

  public List<RespuestaPoliticaResumen> listarPoliticasPorEstado(EstadoPolitica estado) {
    return politicaRepository.findByEstado(estado)
        .stream()
        .map(this::mapearAResumen)
        .collect(Collectors.toList());
  }

  public RespuestaPolitica obtenerPoliticaPorId(String id) {
    return mapearARespuesta(buscarPorId(id));
  }

  public RespuestaPolitica crearPolitica(SolicitudCrearPolitica solicitud, String correoAdmin) {
    Politica politica = Politica.builder()
        .nombre(solicitud.getNombre())
        .descripcion(solicitud.getDescripcion())
        .estado(EstadoPolitica.BORRADOR)
        .creadoPor(correoAdmin)
        .build();

    return mapearARespuesta(politicaRepository.save(politica));
  }

  public RespuestaPolitica actualizarPolitica(String id, SolicitudActualizarPolitica solicitud) {
    Politica politica = buscarPorId(id);

    if (solicitud.getNombre() != null) {
      politica.setNombre(solicitud.getNombre());
    }
    if (solicitud.getDescripcion() != null) {
      politica.setDescripcion(solicitud.getDescripcion());
    }

    return mapearARespuesta(politicaRepository.save(politica));
  }

  public RespuestaPolitica actualizarDiagrama(String id, SolicitudActualizarDiagrama solicitud) {
    Politica politica = buscarPorId(id);

    if (solicitud.getCarriles() != null) {
      politica.setCarriles(solicitud.getCarriles());
    }
    if (solicitud.getNodos() != null) {
      politica.setNodos(solicitud.getNodos());
    }
    if (solicitud.getConexiones() != null) {
      politica.setConexiones(solicitud.getConexiones());
    }

    return mapearARespuesta(politicaRepository.save(politica));
  }

  public RespuestaPolitica publicarPolitica(String id) {
    Politica politica = buscarPorId(id);

    if (politica.getEstado() == EstadoPolitica.PUBLICADA) {
      throw new RuntimeException("La política ya está publicada");
    }

    boolean tieneInicio = politica.getNodos().stream()
        .anyMatch(n -> n.getTipo().name().equals("INICIO"));
    boolean tieneFin = politica.getNodos().stream()
        .anyMatch(n -> n.getTipo().name().equals("FIN"));

    if (!tieneInicio || !tieneFin) {
      throw new RuntimeException(
          "La política debe tener al menos un nodo de INICIO y un nodo de FIN para poder publicarse");
    }

    politica.setEstado(EstadoPolitica.PUBLICADA);
    return mapearARespuesta(politicaRepository.save(politica));
  }

  public void eliminarPolitica(String id) {
    Politica politica = buscarPorId(id);
    if (politica.getEstado() == EstadoPolitica.PUBLICADA) {
      throw new RuntimeException("No se puede eliminar una política publicada");
    }
    politicaRepository.deleteById(id);
  }

  // ── CU-11: búsqueda para asesor ────────────────────────────────────────

  public List<RespuestaPoliticaResumen> buscarPoliticasPublicadas(String keyword) {
    if (keyword == null || keyword.isBlank()) {
      return listarPoliticasPorEstado(EstadoPolitica.PUBLICADA);
    }
    return politicaRepository
        .findByNombreContainingIgnoreCaseAndEstado(keyword, EstadoPolitica.PUBLICADA)
        .stream()
        .map(this::mapearAResumen)
        .collect(Collectors.toList());
  }

  private Politica buscarPorId(String id) {
    return politicaRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Política no encontrada con id: " + id));
  }

  private RespuestaPoliticaResumen mapearAResumen(Politica politica) {
    return RespuestaPoliticaResumen.builder()
        .id(politica.getId())
        .nombre(politica.getNombre())
        .descripcion(politica.getDescripcion())
        .estado(politica.getEstado())
        .creadoPor(politica.getCreadoPor())
        .creadoEn(politica.getCreadoEn())
        .actualizadoEn(politica.getActualizadoEn())
        .build();
  }

  private RespuestaPolitica mapearARespuesta(Politica politica) {
    return RespuestaPolitica.builder()
        .id(politica.getId())
        .nombre(politica.getNombre())
        .descripcion(politica.getDescripcion())
        .estado(politica.getEstado())
        .creadoPor(politica.getCreadoPor())
        .carriles(politica.getCarriles())
        .nodos(politica.getNodos())
        .conexiones(politica.getConexiones())
        .creadoEn(politica.getCreadoEn())
        .actualizadoEn(politica.getActualizadoEn())
        .build();
  }
}
