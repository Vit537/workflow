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
public class Formulario {

  private String titulo;
  private String instrucciones;

  @Builder.Default
  private List<String> requisitos = new ArrayList<>();

  @Builder.Default
  private List<CampoFormulario> campos = new ArrayList<>();

  /**
   * "Switch" del administrador: indica si esta actividad requiere que el cliente suba documentos.
   * Solo cuando es true se muestra la sección de carga de archivos al cliente.
   */
  @Builder.Default
  private boolean requiereDocumentos = false;

  /** Extensiones permitidas (ej. ["pdf","docx","xlsx"]). Vacío = cualquier formato. */
  @Builder.Default
  private List<String> tiposPermitidos = new ArrayList<>();

  /** Máximo de archivos que puede subir el cliente (null = sin límite). */
  private Integer maxArchivos;
}
