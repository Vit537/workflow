export type EstadoConsulta = 'PENDIENTE' | 'EN_ATENCION' | 'COMPLETADA';

export interface Consulta {
  id: string;
  clienteNombre: string;
  clienteCorreo?: string;
  clienteTelefono?: string;
  descripcion: string;
  estado: EstadoConsulta;
  asesorCorreo?: string;
  tramiteId?: string;
  mensajeAsesor?: string;
  creadaEn: string;
  atendidaEn?: string;
}
