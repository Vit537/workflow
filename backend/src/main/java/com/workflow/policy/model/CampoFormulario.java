package com.workflow.policy.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampoFormulario {

  private String nombre;
  private String etiqueta;
  private TipoCampo tipoCampo;
  private boolean requerido;
}
