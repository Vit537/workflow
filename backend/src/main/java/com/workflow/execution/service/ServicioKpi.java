package com.workflow.execution.service;

import com.workflow.execution.dto.RespuestaKpi;
import com.workflow.execution.dto.RespuestaKpi.KpiNodo;
import com.workflow.execution.model.EstadoPaso;
import com.workflow.execution.model.EstadoTramite;
import com.workflow.execution.model.PasoTramite;
import com.workflow.execution.model.Tramite;
import com.workflow.execution.repository.TramiteRepository;
import com.workflow.policy.model.TipoNodo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServicioKpi {

  private final TramiteRepository tramiteRepository;

  public RespuestaKpi calcularKpis() {
    List<Tramite> todos = tramiteRepository.findAll();

    long activos = todos.stream().filter(t -> t.getEstado() == EstadoTramite.ACTIVO).count();
    long completados = todos.stream().filter(t -> t.getEstado() == EstadoTramite.COMPLETADO).count();
    long cancelados = todos.stream().filter(t -> t.getEstado() == EstadoTramite.CANCELADO).count();

    // Solo incluir pasos de nodos ACTIVIDAD — excluir nodos estructurales
    // (DECISION, COMPUERTA_PARALELA, COMPUERTA_UNION) que no representan trabajo humano
    Map<String, List<PasoTramite>> pasosPorNodo = todos.stream()
        .flatMap(t -> t.getPasos().stream())
        .filter(p -> p.getTipoNodo() == null || p.getTipoNodo() == TipoNodo.ACTIVIDAD)
        .collect(Collectors.groupingBy(PasoTramite::getNodoId));

    // Calcular tiempo promedio por nodo (en segundos) para detectar cuellos de botella
    Map<String, Double> tiemposPorNodo = new HashMap<>();
    for (Map.Entry<String, List<PasoTramite>> entry : pasosPorNodo.entrySet()) {
      double promedio = entry.getValue().stream()
          .filter(p -> p.getEstado() == EstadoPaso.COMPLETADO
              && p.getAsignadoEn() != null
              && p.getCompletadoEn() != null)
          .mapToLong(p -> Duration.between(p.getAsignadoEn(), p.getCompletadoEn()).toSeconds())
          .average()
          .orElse(0.0);
      tiemposPorNodo.put(entry.getKey(), promedio);
    }

    // Promedio general (de todos los nodos que tienen datos)
    double promedioGeneral = tiemposPorNodo.values().stream()
        .filter(v -> v > 0)
        .mapToDouble(Double::doubleValue)
        .average()
        .orElse(0.0);

    double umbralCuello = promedioGeneral * 1.30;

    List<KpiNodo> kpiNodos = pasosPorNodo.entrySet().stream()
        .map(entry -> {
          String nodoId = entry.getKey();
          List<PasoTramite> pasos = entry.getValue();

          long completadosNodo = pasos.stream()
              .filter(p -> p.getEstado() == EstadoPaso.COMPLETADO).count();
          long pendientesNodo = pasos.stream()
              .filter(p -> p.getEstado() != EstadoPaso.COMPLETADO).count();

          String etiqueta = pasos.stream()
              .map(PasoTramite::getEtiquetaNodo)
              .filter(Objects::nonNull)
              .findFirst()
              .orElse(nodoId);

          String carril = pasos.stream()
              .map(PasoTramite::getCarrilNombre)
              .filter(Objects::nonNull)
              .findFirst()
              .orElse("—");

          double tiempoPromedio = tiemposPorNodo.getOrDefault(nodoId, 0.0);
          boolean esCuello = promedioGeneral > 0 && tiempoPromedio > umbralCuello;

          return KpiNodo.builder()
              .nodoId(nodoId)
              .etiquetaNodo(etiqueta)
              .carrilNombre(carril)
              .completados(completadosNodo)
              .pendientes(pendientesNodo)
              .tiempoPromedioSegundos(tiempoPromedio)
              .cuelloDeBotella(esCuello)
              .build();
        })
        .sorted(Comparator.comparingDouble(KpiNodo::getTiempoPromedioSegundos).reversed())
        .collect(Collectors.toList());

    return RespuestaKpi.builder()
        .tramitesActivos(activos)
        .tramitesCompletados(completados)
        .tramitesCancelados(cancelados)
        .kpiPorNodo(kpiNodos)
        .build();
  }
}
