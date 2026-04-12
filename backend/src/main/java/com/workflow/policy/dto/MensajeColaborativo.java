package com.workflow.policy.dto;

import lombok.Data;

@Data
public class MensajeColaborativo {

  private String tipo;           // CAMBIO_DIAGRAMA | CURSOR | BLOQUEO_NODO | DESBLOQUEO_NODO
  private String politicaId;
  private String autorCorreo;
  private String autorNombre;
  private Object payload;        // diagrama parcial, posicion de cursor, id del nodo, etc.
}
