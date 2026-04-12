package com.workflow.policy.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SolicitudCrearPolitica {

  @NotBlank(message = "El nombre es obligatorio")
  private String nombre;

  private String descripcion;
}
