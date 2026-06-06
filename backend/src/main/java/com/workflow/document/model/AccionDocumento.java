package com.workflow.document.model;

/** Tipos de acción auditables sobre un documento (para los logs de quién ve / quién modifica). */
public enum AccionDocumento {
  VER,
  DESCARGAR,
  CREAR,
  SUBIR_VERSION,
  RESTAURAR,
  ELIMINAR,
  COMENTAR,
  BLOQUEAR,
  DESBLOQUEAR,
  CAMBIAR_PERMISO,
  /** Se abrió el documento en el editor en vivo (OnlyOffice). */
  EDITAR_ONLINE,
  /** OnlyOffice devolvió el documento editado y se guardó como versión nueva. */
  GUARDAR_ONLINE
}
