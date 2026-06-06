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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "consultas")
public class Consulta {

  @Id
  private String id;

  /** Id del usuario CLIENTE dueño de la consulta (autenticado). */
  @Indexed
  private String clienteId;

  /** Datos del cliente */
  private String clienteNombre;
  @Indexed
  private String clienteCorreo;
  private String clienteTelefono;

  /** Descripción del problema que el cliente quiere resolver */
  private String descripcion;

  private EstadoConsulta estado;

  /** Asesor que atendió la consulta */
  private String asesorCorreo;

  /** Trámite iniciado por el asesor para este cliente */
  @Indexed
  private String tramiteId;

  /** FCM token del dispositivo del cliente para enviarle notificaciones push */
  private String fcmToken;

  /** Mensaje que el asesor envía al cliente con el proceso a seguir */
  private String mensajeAsesor;

  @CreatedDate
  private Instant creadaEn;

  private Instant atendidaEn;
}
