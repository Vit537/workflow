package com.workflow.consulta.dto;

import com.workflow.consulta.model.EstadoConsulta;
import com.workflow.execution.dto.RespuestaTramite;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Respuesta enriquecida para que el asesor verifique una consulta por correo + descripción.
 * Incluye los datos de la consulta y, si existe, el progreso del trámite vinculado.
 */
@Data
@Builder
public class RespuestaVerificacionConsulta {

  private String consultaId;
  private String clienteNombre;
  private String clienteCorreo;
  private String clienteTelefono;
  private String descripcion;
  private EstadoConsulta estadoConsulta;
  private String asesorCorreo;
  private String mensajeAsesor;
  private Instant creadaEn;
  private Instant atendidaEn;

  /** Progreso del trámite vinculado (null si aún no se asignó política). */
  private RespuestaTramite tramite;

  /** Indica si la descripción proporcionada coincide con la de la consulta. */
  private boolean descripcionCoincide;
}
