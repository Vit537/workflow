package com.workflow.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RespuestaComentario {
  private String id;
  private String autorId;
  private String autorNombre;
  private String texto;
  private Instant fecha;
}
