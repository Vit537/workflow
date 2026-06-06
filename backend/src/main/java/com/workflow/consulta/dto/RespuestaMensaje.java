package com.workflow.consulta.dto;

import com.workflow.iam.model.Rol;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RespuestaMensaje {
  private String id;
  private String consultaId;
  private String autorId;
  private String autorNombre;
  private Rol autorRol;
  private String texto;
  private boolean leido;
  private Instant fecha;
}
