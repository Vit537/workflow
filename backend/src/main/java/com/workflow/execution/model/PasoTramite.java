package com.workflow.execution.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import com.workflow.policy.model.TipoNodo;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasoTramite {

  private String nodoId;
  private String etiquetaNodo;
  private String carrilNombre;
  /** Tipo del nodo (ACTIVIDAD, DECISION, COMPUERTA_PARALELA, etc.) */
  private TipoNodo tipoNodo;
  private String asignadoA;
  private EstadoPaso estado;
  private Instant asignadoEn;
  private Instant completadoEn;
  private Map<String, Object> datosFormulario;
}
