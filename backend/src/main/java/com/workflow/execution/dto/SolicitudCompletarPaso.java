package com.workflow.execution.dto;

import lombok.Data;

import java.util.Map;

@Data
public class SolicitudCompletarPaso {

  /** Condición elegida para flujos CONDICIONAL / ITERATIVO. */
  private String condicionElegida;

  /** Datos del formulario llenado por el asesor. */
  private Map<String, Object> datosFormulario;
}
