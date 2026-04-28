package com.workflow.consulta.dto;

import com.workflow.consulta.model.EstadoConsulta;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class RespuestaConsulta {

  private String id;
  private String clienteNombre;
  private String clienteCorreo;
  private String clienteTelefono;
  private String descripcion;
  private EstadoConsulta estado;
  private String asesorCorreo;
  private String tramiteId;
  private String mensajeAsesor;
  /** No exponemos el fcmToken en las respuestas por seguridad */
  private Instant creadaEn;
  private Instant atendidaEn;
}
