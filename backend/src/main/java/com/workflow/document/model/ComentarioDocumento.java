package com.workflow.document.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Comentario sobre un documento (colaboración). Embebido en {@code Documento.comentarios}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComentarioDocumento {

  private String id;
  private String autorId;
  private String autorNombre;
  private String texto;
  private Instant fecha;
}
