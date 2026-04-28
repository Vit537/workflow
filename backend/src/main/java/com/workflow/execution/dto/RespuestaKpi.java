package com.workflow.execution.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RespuestaKpi {

  /** Total de trámites activos */
  private long tramitesActivos;

  /** Total de trámites completados */
  private long tramitesCompletados;

  /** Total de trámites cancelados */
  private long tramitesCancelados;

  /** KPI por nodo: tiempo promedio en completar y conteo de trámites que pasaron por él */
  private List<KpiNodo> kpiPorNodo;

  @Data
  @Builder
  public static class KpiNodo {
    /** ID del nodo en la política */
    private String nodoId;

    /** Etiqueta legible del nodo */
    private String etiquetaNodo;

    /** Nombre del carril/departamento */
    private String carrilNombre;

    /** Cuántos pasos de este nodo se han completado */
    private long completados;

    /** Cuántos pasos de este nodo están pendientes o en progreso */
    private long pendientes;

    /**
     * Tiempo promedio en segundos para completar este nodo
     * (calculado desde asignadoEn hasta completadoEn)
     */
    private double tiempoPromedioSegundos;

    /** true si este nodo supera el 130 % del tiempo promedio general (cuello de botella) */
    private boolean cuelloDeBotella;
  }
}
