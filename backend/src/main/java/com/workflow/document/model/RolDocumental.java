package com.workflow.document.model;

/**
 * Rol de un responsable sobre el repositorio documental de una política.
 *
 * <pre>
 * Rol           Ver  Descargar  Comentar  Subir versión  Gestionar (eliminar/permisos)
 * PROPIETARIO    ✓       ✓          ✓            ✓                    ✓
 * EDITOR         ✓       ✓          ✓            ✓                    ✗
 * COMENTARISTA   ✓       ✓          ✓            ✗                    ✗
 * LECTOR         ✓       ✓          ✗            ✗                    ✗
 * </pre>
 */
public enum RolDocumental {
  PROPIETARIO,
  EDITOR,
  COMENTARISTA,
  LECTOR
}
