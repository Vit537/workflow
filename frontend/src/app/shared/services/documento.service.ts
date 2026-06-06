import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Documento, LogDocumento, Responsable, RolDocumental, RespuestaConfigOnlyOffice,
} from '../models/documento.model';

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private readonly api = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  // ── Repositorio de la política ──────────────────────────────────────────

  listarPorPolitica(politicaId: string, nodoId?: string): Observable<Documento[]> {
    let params = new HttpParams();
    if (nodoId) params = params.set('nodoId', nodoId);
    return this.http.get<Documento[]>(`${this.api}/politicas/${politicaId}/documentos`, { params });
  }

  crearDocumento(politicaId: string, archivo: File, opciones?: {
    nombre?: string; descripcion?: string; nodoId?: string; notaCambio?: string;
  }): Observable<Documento> {
    const form = new FormData();
    form.append('archivo', archivo);
    if (opciones?.nombre) form.append('nombre', opciones.nombre);
    if (opciones?.descripcion) form.append('descripcion', opciones.descripcion);
    if (opciones?.nodoId) form.append('nodoId', opciones.nodoId);
    if (opciones?.notaCambio) form.append('notaCambio', opciones.notaCambio);
    return this.http.post<Documento>(`${this.api}/politicas/${politicaId}/documentos`, form);
  }

  // ── Documento individual ──────────────────────────────────────────────────

  obtener(documentoId: string): Observable<Documento> {
    return this.http.get<Documento>(`${this.api}/documentos/${documentoId}`);
  }

  subirVersion(documentoId: string, archivo: File, notaCambio?: string): Observable<Documento> {
    const form = new FormData();
    form.append('archivo', archivo);
    if (notaCambio) form.append('notaCambio', notaCambio);
    return this.http.post<Documento>(`${this.api}/documentos/${documentoId}/versiones`, form);
  }

  restaurarVersion(documentoId: string, numero: number): Observable<Documento> {
    return this.http.post<Documento>(`${this.api}/documentos/${documentoId}/restaurar/${numero}`, {});
  }

  archivar(documentoId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/documentos/${documentoId}`);
  }

  // ── Descargas (blob + nombre desde Content-Disposition) ───────────────────

  descargarActual(documentoId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.api}/documentos/${documentoId}/descargar`,
      { responseType: 'blob', observe: 'response' });
  }

  descargarVersion(documentoId: string, numero: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.api}/documentos/${documentoId}/versiones/${numero}/descargar`,
      { responseType: 'blob', observe: 'response' });
  }

  // ── Colaboración ───────────────────────────────────────────────────────────

  comentar(documentoId: string, texto: string): Observable<Documento> {
    return this.http.post<Documento>(`${this.api}/documentos/${documentoId}/comentarios`, { texto });
  }

  bloquear(documentoId: string): Observable<Documento> {
    return this.http.post<Documento>(`${this.api}/documentos/${documentoId}/bloquear`, {});
  }

  desbloquear(documentoId: string): Observable<Documento> {
    return this.http.post<Documento>(`${this.api}/documentos/${documentoId}/desbloquear`, {});
  }

  // ── Auditoría ───────────────────────────────────────────────────────────────

  logsDocumento(documentoId: string): Observable<LogDocumento[]> {
    return this.http.get<LogDocumento[]>(`${this.api}/documentos/${documentoId}/logs`);
  }

  logsRepositorio(politicaId: string): Observable<LogDocumento[]> {
    return this.http.get<LogDocumento[]>(`${this.api}/politicas/${politicaId}/documentos/logs`);
  }

  // ── Responsables / permisos ───────────────────────────────────────────────

  listarResponsables(politicaId: string): Observable<Responsable[]> {
    return this.http.get<Responsable[]>(`${this.api}/politicas/${politicaId}/responsables`);
  }

  agregarResponsable(politicaId: string, correo: string, rolDocumental: RolDocumental): Observable<Responsable[]> {
    return this.http.post<Responsable[]>(`${this.api}/politicas/${politicaId}/responsables`,
      { correo, rolDocumental });
  }

  eliminarResponsable(politicaId: string, usuarioId: string): Observable<Responsable[]> {
    return this.http.delete<Responsable[]>(`${this.api}/politicas/${politicaId}/responsables/${usuarioId}`);
  }

  // ── Co-edición en vivo (OnlyOffice) ───────────────────────────────────────

  /** Config firmada para abrir el documento en el editor en vivo. */
  configOnlyOffice(documentoId: string): Observable<RespuestaConfigOnlyOffice> {
    return this.http.get<RespuestaConfigOnlyOffice>(
      `${this.api}/documentos/${documentoId}/onlyoffice/config`);
  }

  // ── Utilidad: dispara la descarga de un blob en el navegador ──────────────

  guardarBlob(respuesta: HttpResponse<Blob>, nombrePorDefecto = 'documento'): void {
    const blob = respuesta.body;
    if (!blob) return;
    const nombre = this.nombreDesdeContentDisposition(respuesta) ?? nombrePorDefecto;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private nombreDesdeContentDisposition(respuesta: HttpResponse<Blob>): string | null {
    const cd = respuesta.headers.get('Content-Disposition');
    if (!cd) return null;
    const match = /filename="?([^"]+)"?/.exec(cd);
    return match ? match[1] : null;
  }
}
