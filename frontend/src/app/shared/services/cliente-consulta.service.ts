import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Consulta, ConsultaDetalle, MensajeConsulta } from '../models/cliente.model';

/** Servicios del cliente para consultas, su progreso y la mensajería con el asesor. */
@Injectable({ providedIn: 'root' })
export class ClienteConsultaService {
  private readonly api = `${environment.apiUrl}/api/consultas`;

  constructor(private http: HttpClient) {}

  // ── Consultas ──────────────────────────────────────────────────────────
  misConsultas(): Observable<Consulta[]> {
    return this.http.get<Consulta[]>(`${this.api}/mias`);
  }

  crearConsulta(descripcion: string): Observable<Consulta> {
    return this.http.post<Consulta>(this.api, { descripcion });
  }

  detalle(consultaId: string): Observable<ConsultaDetalle> {
    return this.http.get<ConsultaDetalle>(`${this.api}/mias/${consultaId}`);
  }

  // ── Mensajería ─────────────────────────────────────────────────────────
  mensajes(consultaId: string): Observable<MensajeConsulta[]> {
    return this.http.get<MensajeConsulta[]>(`${this.api}/${consultaId}/mensajes`);
  }

  enviarMensaje(consultaId: string, texto: string): Observable<MensajeConsulta> {
    return this.http.post<MensajeConsulta>(`${this.api}/${consultaId}/mensajes`, { texto });
  }

  // ── Envío de datos del formulario de un paso ─────────────────────────────
  enviarDatos(tramiteId: string, nodoId: string, datos: Record<string, unknown>): Observable<unknown> {
    return this.http.post(
      `${environment.apiUrl}/api/tramites/${tramiteId}/pasos/${nodoId}/datos-cliente`, datos);
  }

  // ── Subida de archivos del cliente (a un paso del trámite) ───────────────
  subirArchivo(tramiteId: string, nodoId: string, campo: string, archivo: File): Observable<unknown> {
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('campo', campo);
    return this.http.post(`${environment.apiUrl}/api/tramites/${tramiteId}/pasos/${nodoId}/archivos`, form);
  }
}
