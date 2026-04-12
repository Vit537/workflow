package com.workflow.iam.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SolicitudLogin {

  @NotBlank(message = "El correo es obligatorio")
  @Email(message = "El correo no tiene un formato válido")
  private String correo;

  @NotBlank(message = "La contraseña es obligatoria")
  private String contrasena;
}
