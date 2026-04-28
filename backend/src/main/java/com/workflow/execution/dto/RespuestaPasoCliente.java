package com.workflow.execution.dto;

import com.workflow.execution.model.EstadoPaso;
import com.workflow.policy.model.Formulario;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

/**
 * Lo que el cliente ve de su paso activo actual.
 * Solo se expone el paso en el que está, no todos los pasos del trámite.
 */
@Data
@Builder
public class RespuestaPasoCliente {

  /** Identificador del nodo del paso activo (necesario para enviar datos del formulario). */
  private String nodoId;

  /** Qué departamento lo está atendiendo en este momento. */
  private String departamento;

  /** Nombre de la actividad/paso actual. */
  private String actividad;

  /** Estado actual del paso. */
  private EstadoPaso estado;

  /** Formulario con instrucciones y campos que el cliente debe completar. */
  private Formulario formulario;

  /** Datos que el cliente ya envió en este paso (si aplica). */
  private Map<String, Object> datosEnviados;

  /** Cuándo se activó este paso. */
  private Instant activadoEn;

  // ── Progreso general del trámite ──────────────────────────────────────

  /** Número del paso actual (ej. 1 de 3). */
  private int pasoActualNumero;

  /** Total de pasos del trámite. */
  private int totalPasos;

  /** Pasos ya completados. */
  private int pasosCompletados;

  /** true cuando todos los pasos están completados (trámite finalizado). */
  private boolean tramiteCompletado;
}
