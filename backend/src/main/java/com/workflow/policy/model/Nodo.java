package com.workflow.policy.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Nodo {

  private String id;
  private String carrilId;
  private String etiqueta;
  private TipoNodo tipo;
  private TipoFlujo tipoFlujo;

  // Posición visual en el diagrama
  private double posX;
  private double posY;
  private double ancho;
  private double alto;

  // Formulario asociado (opcional)
  private Formulario formulario;

  // Condiciones de salida para flujo condicional
  @Builder.Default
  private List<String> condiciones = new ArrayList<>();
}
