package com.workflow.iam.dto;

import com.workflow.iam.model.Rol;
import lombok.Data;

@Data
public class SolicitudActualizarUsuario {

  private String nombre;
  private String correo;
  private String contrasena;
  private Rol rol;
  private Boolean activo;
}
