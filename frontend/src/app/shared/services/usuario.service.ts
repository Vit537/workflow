import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RespuestaUsuario } from '../models/user.model';

export interface SolicitudCrearUsuario {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: 'ADMIN' | 'ASESOR';
}

export interface SolicitudActualizarUsuario {
  nombre?: string;
  correo?: string;
  contrasena?: string;
  rol?: 'ADMIN' | 'ASESOR';
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly urlApi = 'http://localhost:8080/api/usuarios';

  constructor(private http: HttpClient) {}

  listarUsuarios(): Observable<RespuestaUsuario[]> {
    return this.http.get<RespuestaUsuario[]>(this.urlApi);
  }

  obtenerUsuario(id: string): Observable<RespuestaUsuario> {
    return this.http.get<RespuestaUsuario>(`${this.urlApi}/${id}`);
  }

  crearUsuario(solicitud: SolicitudCrearUsuario): Observable<RespuestaUsuario> {
    return this.http.post<RespuestaUsuario>(this.urlApi, solicitud);
  }

  actualizarUsuario(id: string, solicitud: SolicitudActualizarUsuario): Observable<RespuestaUsuario> {
    return this.http.put<RespuestaUsuario>(`${this.urlApi}/${id}`, solicitud);
  }

  desactivarUsuario(id: string): Observable<void> {
    return this.http.patch<void>(`${this.urlApi}/${id}/desactivar`, {});
  }

  activarUsuario(id: string): Observable<void> {
    return this.http.patch<void>(`${this.urlApi}/${id}/activar`, {});
  }
}
