import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface KpiNodo {
  nodoId: string;
  etiquetaNodo: string;
  carrilNombre: string;
  completados: number;
  pendientes: number;
  tiempoPromedioSegundos: number;
  cuelloDeBotella: boolean;
}

export interface RespuestaKpi {
  tramitesActivos: number;
  tramitesCompletados: number;
  tramitesCancelados: number;
  kpiPorNodo: KpiNodo[];
}

@Injectable({ providedIn: 'root' })
export class KpiService {
  private readonly urlApi = 'http://localhost:8080/api/kpis';

  constructor(private http: HttpClient) {}

  obtenerKpis(): Observable<RespuestaKpi> {
    return this.http.get<RespuestaKpi>(this.urlApi);
  }
}
