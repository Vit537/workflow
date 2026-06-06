package com.workflow.consulta.dto;

import com.workflow.consulta.model.EstadoConsulta;
import com.workflow.execution.dto.RespuestaTramite;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Detalle de una consulta para el cliente, con el progreso del trámite vinculado
 * (pasos: lo que ya hizo y lo que falta).
 */
@Data
@Builder
public class RespuestaConsultaCliente {

  private String id;
  private String descripcion;
  private EstadoConsulta estado;
  private String asesorCorreo;
  private String mensajeAsesor;
  private String tramiteId;
  private Instant creadaEn;
  private Instant atendidaEn;

  /** Progreso del trámite (null si el asesor aún no lo inició). */
  private RespuestaTramite tramite;
}
