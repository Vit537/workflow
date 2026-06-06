package com.workflow.consulta.model;

import com.workflow.iam.model.Rol;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** Mensaje del hilo de conversación entre el cliente y el asesor en una consulta. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "mensajes_consulta")
public class MensajeConsulta {

  @Id
  private String id;

  @Indexed
  private String consultaId;

  private String autorId;
  private String autorNombre;
  private Rol autorRol;

  private String texto;

  private boolean leido;

  @CreatedDate
  private Instant fecha;
}
