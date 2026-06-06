package com.workflow.consulta.dto;

import com.workflow.consulta.model.TipoNotificacion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RespuestaNotificacion {
  private String id;
  private String titulo;
  private String cuerpo;
  private TipoNotificacion tipo;
  private String referenciaId;
  private boolean leida;
  private Instant creadaEn;
}
