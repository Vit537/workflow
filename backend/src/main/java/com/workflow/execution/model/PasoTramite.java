package com.workflow.execution.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasoTramite {

  private String nodoId;
  private String etiquetaNodo;
  private String carrilNombre;
  private String asignadoA;
  private EstadoPaso estado;
  private Instant asignadoEn;
  private Instant completadoEn;
  private Map<String, Object> datosFormulario;
}
