import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoNodo } from '../models/policy.model';

export interface CarrilIA {
  id: string;
  nombre: string;
  orden: number;
}

export interface NodoIA {
  id: string;
  etiqueta: string;
  tipo: TipoNodo;
  posX: number;
  posY: number;
  ancho: number;
  alto: number;
  carrilId: string;
}

export interface ConexionIA {
  id: string;
  origenId: string;
  destinoId: string;
  etiqueta?: string;
}

export interface DiagramaIA {
  carriles: CarrilIA[];
  nodos: NodoIA[];
  conexiones: ConexionIA[];
}

export interface RespuestaIA {
  diagrama: DiagramaIA;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly urlApi = 'http://localhost:8001/api/ia';

  constructor(private http: HttpClient) {}

  generarDiagrama(prompt: string): Observable<RespuestaIA> {
    return this.http.post<RespuestaIA>(`${this.urlApi}/generar-diagrama`, { prompt });
  }
}
