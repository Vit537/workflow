package com.workflow.document.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Mensaje de presencia: quién está viendo/editando un documento (efímero, vía WebSocket).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MensajePresenciaDocumento {
  private String documentoId;
  private String usuarioCorreo;
  private String usuarioNombre;
  /** ENTRO | SALIO | EDITANDO */
  private String accion;
}
