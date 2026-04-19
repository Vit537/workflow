import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { RespuestaAuth, Usuario } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly urlApi = 'http://localhost:8080/api/auth';
  private readonly CLAVE_TOKEN = 'workflow_token';

  private usuarioActualSubject = new BehaviorSubject<Usuario | null>(this.cargarUsuarioDesdeToken());
  usuarioActual$ = this.usuarioActualSubject.asObservable();

  constructor(private http: HttpClient) {}

  iniciarSesion(correo: string, contrasena: string): Observable<RespuestaAuth> {
    return this.http.post<RespuestaAuth>(`${this.urlApi}/login`, { correo, contrasena }).pipe(
      tap(respuesta => {
        localStorage.setItem(this.CLAVE_TOKEN, respuesta.token);
        const usuario: Usuario = {
          id: respuesta.id,
          nombre: respuesta.nombre,
          correo: respuesta.correo,
          rol: respuesta.rol,
          activo: true,
        };
        this.usuarioActualSubject.next(usuario);
      })
    );
  }

  cerrarSesion(): void {
    localStorage.removeItem(this.CLAVE_TOKEN);
    this.usuarioActualSubject.next(null);
  }

  obtenerToken(): string | null {
    return localStorage.getItem(this.CLAVE_TOKEN);
  }

  estaAutenticado(): boolean {
    const token = this.obtenerToken();
    if (!token) return false;
    try {
      const decodificado: any = jwtDecode(token);
      if (decodificado.exp * 1000 > Date.now()) return true;
      // Token expirado — limpiarlo del storage
      localStorage.removeItem(this.CLAVE_TOKEN);
      this.usuarioActualSubject.next(null);
      return false;
    } catch {
      localStorage.removeItem(this.CLAVE_TOKEN);
      this.usuarioActualSubject.next(null);
      return false;
    }
  }

  obtenerUsuarioActual(): Usuario | null {
    return this.usuarioActualSubject.value;
  }

  obtenerRol(): 'ADMIN' | 'ASESOR' | null {
    return this.obtenerUsuarioActual()?.rol ?? null;
  }

  private cargarUsuarioDesdeToken(): Usuario | null {
    const token = localStorage.getItem(this.CLAVE_TOKEN);
    if (!token) return null;
    try {
      const decodificado: any = jwtDecode(token);
      if (decodificado.exp * 1000 < Date.now()) return null;
      return {
        id: decodificado.id ?? decodificado.sub,
        correo: decodificado.sub,
        nombre: decodificado.nombre ?? '',
        rol: decodificado.rol,
        activo: true,
      };
    } catch {
      return null;
    }
  }
}
