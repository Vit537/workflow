export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: 'ADMIN' | 'ASESOR';
  activo: boolean;
}

export interface RespuestaUsuario {
  id: string;
  nombre: string;
  correo: string;
  rol: 'ADMIN' | 'ASESOR';
  activo: boolean;
}

export interface RespuestaAuth {
  token: string;
  id: string;
  nombre: string;
  correo: string;
  rol: 'ADMIN' | 'ASESOR';
}
