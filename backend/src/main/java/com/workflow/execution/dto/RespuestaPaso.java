package com.workflow.execution.dto;

import com.workflow.execution.model.EstadoPaso;
import com.workflow.policy.model.Formulario;
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

  /**
   * Definición del formulario de este paso (tomada de la política).
   * Incluye {@code requiereDocumentos}: solo cuando es true el cliente debe subir archivos.
   * Puede ser null si el nodo no tiene formulario configurado.
   */
  private Formulario formulario;
}
