package com.workflow.document.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Registro de auditoría: quién vio / descargó / modificó un documento y cuándo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "logs_documentos")
public class LogDocumento {

  @Id
  private String id;

  @Indexed
  private String documentoId;

  @Indexed
  private String politicaId;

  private String usuarioId;
  private String usuarioCorreo;

  private AccionDocumento accion;

  /** Versión afectada (cuando aplica). */
  private Integer versionNumero;

  /** Detalle libre opcional. */
  private String detalle;

  @CreatedDate
  private Instant fecha;
}
