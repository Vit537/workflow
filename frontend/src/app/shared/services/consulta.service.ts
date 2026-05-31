import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Consulta, EstadoConsulta } from '../models/consulta.model';

export interface RespuestaVerificacion {
  consultaId: string;
  clienteNombre: string;
  clienteCorreo?: string;
  clienteTelefono?: string;
  descripcion: string;
  estadoConsulta: string;
  descripcionCoincide: boolean;
  tramite?: { estado: string; [key: string]: unknown };
}

import { environment } from '../../../../environments/environment';
const API = `${environment.apiUrl}/api/consultas`;

@Injectable({ providedIn: 'root' })
export class ConsultaService {
  constructor(private http: HttpClient) {}

  listar(estado?: EstadoConsulta): Observable<Consulta[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.http.get<Consulta[]>(API, { params });
  }

  obtener(id: string): Observable<Consulta> {
    return this.http.get<Consulta>(`${API}/${id}`);
  }

  atender(id: string, body: { mensajeAsesor: string; politicaId?: string }): Observable<Consulta> {
    return this.http.post<Consulta>(`${API}/${id}/atender`, body);
  }

  completar(id: string): Observable<Consulta> {
    return this.http.post<Consulta>(`${API}/${id}/completar`, {});
  }

  /** Verificación de identidad del cliente antes de atender */
  verificar(correo: string, descripcion?: string): Observable<RespuestaVerificacion> {
    let params = new HttpParams().set('correo', correo);
    if (descripcion) params = params.set('descripcion', descripcion);
    return this.http.get<RespuestaVerificacion>(`${API}/verificar`, { params });
  }
}
