export type RolUsuario = 'ADMIN' | 'ASESOR' | 'CLIENTE';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  telefono?: string;
}

export interface RespuestaUsuario {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
}

export interface RespuestaAuth {
  token: string;
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
}
