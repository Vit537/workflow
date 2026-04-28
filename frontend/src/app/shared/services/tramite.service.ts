import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type EstadoTramite = 'ACTIVO' | 'COMPLETADO' | 'CANCELADO';
export type EstadoPaso = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'BLOQUEADO';

export interface RespuestaPaso {
  nodoId: string;
  etiquetaNodo: string;
  carrilNombre: string;
  asignadoA: string;
  estado: EstadoPaso;
  asignadoEn: string;
  completadoEn?: string;
  datosFormulario?: Record<string, unknown>;
}

export interface RespuestaTramite {
  id: string;
  politicaId: string;
  nombrePolitica: string;
  iniciadoPor: string;
  estado: EstadoTramite;
  pasos: RespuestaPaso[];
  iniciadoEn: string;
  finalizadoEn?: string;
  // Datos del cliente vinculados desde la consulta
  consultaId?: string;
  clienteNombre?: string;
  clienteCorreo?: string;
  descripcionConsulta?: string;
}

@Injectable({ providedIn: 'root' })
export class TramiteService {
  private readonly urlApi = 'http://localhost:8080/api/tramites';

  constructor(private http: HttpClient) {}

  crearTramite(politicaId: string): Observable<RespuestaTramite> {
    return this.http.post<RespuestaTramite>(this.urlApi, { politicaId });
  }

  /** Trámites asignados al asesor autenticado */
  misActividades(): Observable<RespuestaTramite[]> {
    return this.http.get<RespuestaTramite[]>(`${this.urlApi}/mis-actividades`);
  }

  listarActivos(): Observable<RespuestaTramite[]> {
    return this.http.get<RespuestaTramite[]>(this.urlApi);
  }

  obtenerTramite(id: string): Observable<RespuestaTramite> {
    return this.http.get<RespuestaTramite>(`${this.urlApi}/${id}`);
  }

  completarPaso(
    tramiteId: string,
    nodoId: string,
    solicitud: { condicionElegida?: string; datosFormulario?: Record<string, unknown> } = {}
  ): Observable<RespuestaTramite> {
    return this.http.post<RespuestaTramite>(
      `${this.urlApi}/${tramiteId}/pasos/${nodoId}/completar`, solicitud);
  }

  /** Cambia el estado de un paso a PENDIENTE / EN_PROGRESO / BLOQUEADO */
  cambiarEstadoPaso(
    tramiteId: string,
    nodoId: string,
    estado: 'PENDIENTE' | 'EN_PROGRESO' | 'BLOQUEADO'
  ): Observable<RespuestaTramite> {
    return this.http.patch<RespuestaTramite>(
      `${this.urlApi}/${tramiteId}/pasos/${nodoId}/estado`, { estado });
  }

  /** URL para descargar un archivo subido por el cliente */
  urlDescargaArchivo(tramiteId: string, nodoId: string, rutaRelativa: string): string {
    return `${this.urlApi}/${tramiteId}/pasos/${nodoId}/archivos?rutaRelativa=${encodeURIComponent(rutaRelativa)}`;
  }
}
