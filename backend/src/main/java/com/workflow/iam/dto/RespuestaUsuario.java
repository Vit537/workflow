package com.workflow.iam.dto;

import com.workflow.iam.model.Rol;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RespuestaUsuario {

  private String id;
  private String nombre;
  private String correo;
  private Rol rol;
  private boolean activo;
}
