package com.workflow.policy.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Carril {

  private String id;
  private String nombre;
  private int orden;

  /** true = columna (label arriba) | false/null = fila (label lateral) */
  private Boolean horizontal;

  /** Posición y tamaño del swimlane en el canvas (persiste movimientos del usuario) */
  private Double posX;
  private Double posY;
  private Double ancho;
  private Double alto;
}
