import { RespuestaTramite } from '../services/tramite.service';

export type EstadoConsulta = 'PENDIENTE' | 'EN_ATENCION' | 'COMPLETADA';

export interface Consulta {
  id: string;
  clienteNombre?: string;
  clienteCorreo?: string;
  clienteTelefono?: string;
  descripcion: string;
  estado: EstadoConsulta;
  asesorCorreo?: string;
  tramiteId?: string;
  mensajeAsesor?: string;
  creadaEn?: string;
  atendidaEn?: string;
}

/** Detalle con progreso del trámite (pasos). */
export interface ConsultaDetalle {
  id: string;
  descripcion: string;
  estado: EstadoConsulta;
  asesorCorreo?: string;
  mensajeAsesor?: string;
  tramiteId?: string;
  creadaEn?: string;
  atendidaEn?: string;
  tramite?: RespuestaTramite;
}

export type RolMensaje = 'CLIENTE' | 'ASESOR' | 'ADMIN';

export interface MensajeConsulta {
  id: string;
  consultaId: string;
  autorId: string;
  autorNombre: string;
  autorRol: RolMensaje;
  texto: string;
  leido: boolean;
  fecha: string;
}

export type TipoNotificacion =
  | 'CONSULTA_ATENDIDA' | 'NUEVO_MENSAJE' | 'PASO_AVANZADO' | 'CONSULTA_COMPLETADA' | 'GENERAL';

export interface Notificacion {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: TipoNotificacion;
  referenciaId?: string;
  leida: boolean;
  creadaEn: string;
}
