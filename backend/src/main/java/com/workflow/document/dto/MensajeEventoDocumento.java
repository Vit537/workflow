package com.workflow.document.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Evento de cambio de un documento difundido a los suscriptores para que refresquen
 * (nueva versión, restauración, bloqueo/desbloqueo, comentario).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MensajeEventoDocumento {
  private String documentoId;
  /** NUEVA_VERSION | RESTAURADA | BLOQUEADO | DESBLOQUEADO | COMENTARIO | ARCHIVADO */
  private String tipo;
  private Integer versionActual;
  private String porNombre;
  private String detalle;
}
