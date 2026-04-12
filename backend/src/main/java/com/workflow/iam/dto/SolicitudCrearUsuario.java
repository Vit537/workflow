package com.workflow.iam.dto;

import com.workflow.iam.model.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SolicitudCrearUsuario {

  @NotBlank(message = "El nombre es obligatorio")
  private String nombre;

  @NotBlank(message = "El correo es obligatorio")
  @Email(message = "El correo no tiene un formato válido")
  private String correo;

  @NotBlank(message = "La contraseña es obligatoria")
  private String contrasena;

  @NotNull(message = "El rol es obligatorio")
  private Rol rol;
}
