package com.workflow.consulta.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** Notificación persistente para un usuario (leída/no leída, eliminable). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notificaciones")
public class Notificacion {

  @Id
  private String id;

  /** Destinatario. */
  @Indexed
  private String usuarioId;

  private String titulo;
  private String cuerpo;

  private TipoNotificacion tipo;

  /** Id de la entidad relacionada (consultaId / tramiteId) para navegar al tocarla. */
  private String referenciaId;

  private boolean leida;

  @CreatedDate
  private Instant creadaEn;
}
