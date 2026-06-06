package com.workflow.consulta.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SolicitudCrearConsulta {

  private String clienteNombre;

  private String clienteCorreo;

  private String clienteTelefono;

  @NotBlank(message = "La descripción del problema es obligatoria")
  private String descripcion;
}
