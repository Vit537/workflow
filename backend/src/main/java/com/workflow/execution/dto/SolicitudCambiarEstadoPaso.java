package com.workflow.execution.dto;

import com.workflow.execution.model.EstadoPaso;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SolicitudCambiarEstadoPaso {

  /**
   * Nuevo estado manual del paso.
   * Solo se permiten: PENDIENTE, EN_PROGRESO, BLOQUEADO.
   * Para completar y avanzar el trámite usar POST /completar.
   */
  @NotNull
  private EstadoPaso estado;
}
