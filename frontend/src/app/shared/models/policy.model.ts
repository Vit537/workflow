export type EstadoPolitica = 'BORRADOR' | 'PUBLICADA' | 'ARCHIVADA';
export type TipoNodo = 'INICIO' | 'FIN' | 'ACTIVIDAD' | 'DECISION' | 'COMPUERTA_PARALELA' | 'COMPUERTA_UNION';
export type TipoFlujo = 'LINEAL' | 'CONDICIONAL' | 'ITERATIVO' | 'PARALELO';
export type TipoCampo = 'TEXTO' | 'NUMERO' | 'FECHA' | 'BOOLEANO' | 'ARCHIVO' | 'SELECCION';

export interface CampoFormulario {
  nombre: string;
  etiqueta: string;
  tipoCampo: TipoCampo;
  requerido: boolean;
}

export interface Formulario {
  titulo: string;
  instrucciones: string;
  requisitos: string[];
  campos: CampoFormulario[];
  /** Switch del admin: indica si esta actividad requiere que el cliente suba documentos. */
  requiereDocumentos?: boolean;
  /** Extensiones permitidas (ej. ['pdf','docx']). Vacío = cualquier formato. */
  tiposPermitidos?: string[];
  /** Máximo de archivos que puede subir el cliente. */
  maxArchivos?: number;
}

export interface Carril {
  id: string;
  nombre: string;
  orden: number;
  /** true = columna (label arriba) | false/undefined = fila (label al lado) */
  horizontal?: boolean;
  /** Geometría persistida del swimlane */
  posX?: number;
  posY?: number;
  ancho?: number;
  alto?: number;
}

export interface Nodo {
  id: string;
  carrilId: string;
  etiqueta: string;
  tipo: TipoNodo;
  tipoFlujo: TipoFlujo;
  posX: number;
  posY: number;
  ancho: number;
  alto: number;
  formulario?: Formulario;
  condiciones: string[];
}

export interface Conexion {
  id: string;
  nodoOrigenId: string;
  nodoDestinoId: string;
  etiqueta?: string;
  condicion?: string;
}

export interface Politica {
  id: string;
  nombre: string;
  descripcion: string;
  estado: EstadoPolitica;
  creadoPor: string;
  carriles: Carril[];
  nodos: Nodo[];
  conexiones: Conexion[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface PoliticaResumen {
  id: string;
  nombre: string;
  descripcion: string;
  estado: EstadoPolitica;
  creadoPor: string;
  creadoEn: string;
  actualizadoEn: string;
}
