package com.workflow.execution.dto;

import com.workflow.execution.model.EstadoTramite;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class RespuestaTramite {

  private String id;
  private String politicaId;
  private String nombrePolitica;
  private String iniciadoPor;
  private EstadoTramite estado;
  private List<RespuestaPaso> pasos;
  private Instant iniciadoEn;
  private Instant finalizadoEn;

  // ── Datos de la consulta vinculada (presentes si el trámite viene de una consulta) ──
  private String consultaId;
  private String clienteNombre;
  private String clienteCorreo;
  private String descripcionConsulta;
}
