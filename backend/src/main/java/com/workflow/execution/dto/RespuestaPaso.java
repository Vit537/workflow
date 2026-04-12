package com.workflow.execution.dto;

import com.workflow.execution.model.EstadoPaso;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
public class RespuestaPaso {

  private String nodoId;
  private String etiquetaNodo;
  private String carrilNombre;
  private String asignadoA;
  private EstadoPaso estado;
  private Instant asignadoEn;
  private Instant completadoEn;
  private Map<String, Object> datosFormulario;
}
