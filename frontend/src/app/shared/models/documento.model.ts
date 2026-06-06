export type EstadoDocumento = 'ACTIVO' | 'ARCHIVADO' | 'BLOQUEADO';

export type RolDocumental = 'PROPIETARIO' | 'EDITOR' | 'COMENTARISTA' | 'LECTOR';

export type AccionDocumento =
  | 'VER' | 'DESCARGAR' | 'CREAR' | 'SUBIR_VERSION' | 'RESTAURAR'
  | 'ELIMINAR' | 'COMENTAR' | 'BLOQUEAR' | 'DESBLOQUEAR' | 'CAMBIAR_PERMISO'
  | 'EDITAR_ONLINE' | 'GUARDAR_ONLINE';

/** Tipo de editor de OnlyOffice según el formato del documento. */
export type DocumentTypeOnlyOffice = 'word' | 'cell' | 'slide' | 'pdf';

export interface VersionDocumento {
  numero: number;
  nombreArchivo: string;
  tipoMime?: string;
  tamanoBytes: number;
  subidoPor: string;
  subidoPorNombre?: string;
  subidoEn: string;
  notaCambio?: string;
}

export interface ComentarioDocumento {
  id: string;
  autorId: string;
  autorNombre?: string;
  texto: string;
  fecha: string;
}

export interface Documento {
  id: string;
  politicaId: string;
  nodoId?: string;
  tramiteId?: string;
  nombre: string;
  descripcion?: string;
  estado: EstadoDocumento;
  bloqueadoPor?: string;
  bloqueadoPorNombre?: string;
  bloqueadoEn?: string;
  versionActual: number;
  creadoPor?: string;
  creadoPorNombre?: string;
  creadoEn?: string;
  actualizadoEn?: string;
  ultimaVersion?: VersionDocumento;
  versiones?: VersionDocumento[];
  comentarios?: ComentarioDocumento[];

  /** Co-edición en vivo (OnlyOffice). */
  editandoEnVivo?: boolean;
  /** true si el formato es editable en vivo y OnlyOffice está activo. */
  editableEnVivo?: boolean;
  /** Tipo de editor de OnlyOffice (word/cell/slide/pdf) o ausente si no es soportado. */
  documentTypeOnlyOffice?: DocumentTypeOnlyOffice;
}

/**
 * Respuesta del endpoint de configuración del editor en vivo
 * (GET /api/documentos/{id}/onlyoffice/config).
 */
export interface RespuestaConfigOnlyOffice {
  /** Config que se pasa tal cual a DocsAPI.DocEditor (incluye el token JWT firmado). */
  config: ConfigEditorOnlyOffice;
  /** URL pública del Document Server desde donde se carga api.js. */
  publicUrl: string;
  /** true si abre en modo edición; false si solo lectura. */
  editable: boolean;
  documentType: DocumentTypeOnlyOffice;
}

/** Config de OnlyOffice (estructura que espera DocsAPI.DocEditor). */
export interface ConfigEditorOnlyOffice {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions?: Record<string, boolean>;
  };
  documentType: string;
  editorConfig: {
    mode: 'edit' | 'view';
    lang?: string;
    callbackUrl?: string;
    user?: { id: string; name: string };
    customization?: Record<string, unknown>;
  };
  token?: string;
  /** Permite campos extra que OnlyOffice acepta sin que los tipemos explícitamente. */
  [extra: string]: unknown;
}

export interface LogDocumento {
  id: string;
  documentoId: string;
  politicaId: string;
  usuarioId: string;
  usuarioCorreo: string;
  accion: AccionDocumento;
  versionNumero?: number;
  detalle?: string;
  fecha: string;
}

export interface Responsable {
  usuarioId: string;
  correo: string;
  nombre: string;
  rolDocumental: RolDocumental;
}

/** Evento de cambio difundido por WebSocket en /topic/documentos/{id}. */
export interface EventoDocumento {
  documentoId: string;
  tipo: 'NUEVA_VERSION' | 'RESTAURADA' | 'BLOQUEADO' | 'DESBLOQUEADO' | 'COMENTARIO' | 'ARCHIVADO';
  versionActual?: number;
  porNombre?: string;
  detalle?: string;
}

/** Mensaje de presencia (efímero) en /topic/documentos/{id}/presencia. */
export interface PresenciaDocumento {
  documentoId: string;
  usuarioCorreo: string;
  usuarioNombre: string;
  accion: 'ENTRO' | 'SALIO' | 'EDITANDO';
}
