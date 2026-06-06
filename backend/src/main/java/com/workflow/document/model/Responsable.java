package com.workflow.document.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Responsable de una política y su rol documental. Embebido en {@code Politica.responsables}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Responsable {

  private String usuarioId;
  private String correo;
  private String nombre;
  private RolDocumental rolDocumental;
}
