package com.workflow.policy.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Conexion {

  private String id;
  private String nodoOrigenId;
  private String nodoDestinoId;
  private String etiqueta;
  private String condicion;
}
