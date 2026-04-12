package com.workflow.policy.dto;

import com.workflow.policy.model.EstadoPolitica;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class RespuestaPoliticaResumen {
  private String id;
  private String nombre;
  private String descripcion;
  private EstadoPolitica estado;
  private String creadoPor;
  private Instant creadoEn;
  private Instant actualizadoEn;
}
