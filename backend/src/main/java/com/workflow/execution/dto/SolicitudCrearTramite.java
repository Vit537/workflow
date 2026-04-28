package com.workflow.execution.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;

@Data
public class SolicitudCrearTramite {

  @NotBlank
  private String politicaId;

  /** Consulta del cliente que originó este trámite (opcional). */
  private String consultaId;
}
