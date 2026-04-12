import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { Politica, PoliticaResumen, EstadoPolitica, Carril, Nodo, Conexion } from '../models/policy.model';

export interface SolicitudCrearPolitica {
  nombre: string;
  descripcion?: string;
}

export interface SolicitudActualizarPolitica {
  nombre?: string;
  descripcion?: string;
}

export interface SolicitudActualizarDiagrama {
  carriles: Carril[];
  nodos: Nodo[];
  conexiones: Conexion[];
}

@Injectable({ providedIn: 'root' })
export class PoliticaService {
  private readonly urlApi = 'http://localhost:8080/api/politicas';

  constructor(private http: HttpClient) {}

  listarPoliticas(estado?: EstadoPolitica): Observable<PoliticaResumen[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<PoliticaResumen[]>(this.urlApi, { params }).pipe(timeout(10000));
  }

  obtenerPolitica(id: string): Observable<Politica> {
    return this.http.get<Politica>(`${this.urlApi}/${id}`);
  }

  crearPolitica(solicitud: SolicitudCrearPolitica): Observable<Politica> {
    return this.http.post<Politica>(this.urlApi, solicitud);
  }

  actualizarPolitica(id: string, solicitud: SolicitudActualizarPolitica): Observable<Politica> {
    return this.http.put<Politica>(`${this.urlApi}/${id}`, solicitud);
  }

  actualizarDiagrama(id: string, diagrama: SolicitudActualizarDiagrama): Observable<Politica> {
    return this.http.put<Politica>(`${this.urlApi}/${id}/diagrama`, diagrama);
  }

  publicarPolitica(id: string): Observable<Politica> {
    return this.http.patch<Politica>(`${this.urlApi}/${id}/publicar`, {});
  }

  eliminarPolitica(id: string): Observable<void> {
    return this.http.delete<void>(`${this.urlApi}/${id}`);
  }
}
