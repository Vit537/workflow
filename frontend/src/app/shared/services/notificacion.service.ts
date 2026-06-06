import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notificacion } from '../models/cliente.model';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly api = `${environment.apiUrl}/api/notificaciones`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(this.api);
  }

  marcarLeida(id: string): Observable<Notificacion> {
    return this.http.patch<Notificacion>(`${this.api}/${id}/leer`, {});
  }

  marcarTodasLeidas(): Observable<void> {
    return this.http.patch<void>(`${this.api}/leer-todas`, {});
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
