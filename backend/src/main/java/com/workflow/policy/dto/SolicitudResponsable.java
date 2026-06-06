package com.workflow.policy.dto;

import com.workflow.document.model.RolDocumental;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Solicitud para agregar/actualizar un responsable del repositorio documental de una política. */
@Data
public class SolicitudResponsable {

  @NotBlank(message = "El correo del usuario es obligatorio")
  private String correo;

  @NotNull(message = "El rol documental es obligatorio")
  private RolDocumental rolDocumental;
}
