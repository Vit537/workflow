package com.workflow.document.model;

public enum EstadoDocumento {
  /** Documento vigente y editable. */
  ACTIVO,
  /** Documento archivado (no se muestra por defecto, conserva historial). */
  ARCHIVADO,
  /** Documento con check-out activo: alguien lo tiene tomado para edición. */
  BLOQUEADO
}
