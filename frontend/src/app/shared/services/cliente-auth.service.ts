import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { RespuestaAuth, Usuario } from '../models/user.model';
import { environment } from '../../../environments/environment';

/**
 * Servicio de autenticación exclusivo para el portal del cliente.
 * Usa una clave de localStorage separada (workflow_cliente_token) para que
 * la sesión del cliente sea completamente independiente de la sesión
 * de admin/asesor (que usa workflow_token en AuthService).
 */
@Injectable({ providedIn: 'root' })
export class ClienteAuthService {
  private readonly urlApi = `${environment.apiUrl}/api/auth`;
  private readonly CLAVE_TOKEN = 'workflow_cliente_token';

  private usuarioActualSubject = new BehaviorSubject<Usuario | null>(
    this.cargarUsuarioDesdeToken()
  );
  usuarioActual$ = this.usuarioActualSubject.asObservable();

  constructor(private http: HttpClient) {}

  iniciarSesion(correo: string, contrasena: string): Observable<RespuestaAuth> {
    return this.http
      .post<RespuestaAuth>(`${this.urlApi}/login`, { correo, contrasena })
      .pipe(tap(respuesta => this.guardarSesion(respuesta)));
  }

  registrarCliente(datos: {
    nombre: string;
    correo: string;
    contrasena: string;
    telefono?: string;
  }): Observable<RespuestaAuth> {
    return this.http
      .post<RespuestaAuth>(`${this.urlApi}/registro`, datos)
      .pipe(tap(respuesta => this.guardarSesion(respuesta)));
  }

  private guardarSesion(respuesta: RespuestaAuth): void {
    localStorage.setItem(this.CLAVE_TOKEN, respuesta.token);
    this.usuarioActualSubject.next({
      id: respuesta.id,
      nombre: respuesta.nombre,
      correo: respuesta.correo,
      rol: respuesta.rol,
      activo: true,
    });
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

  obtenerRol(): 'ADMIN' | 'ASESOR' | 'CLIENTE' | null {
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
