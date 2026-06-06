import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  private readonly urlApi = `${environment.apiUrl}/api/kpis`;

  constructor(private http: HttpClient) {}

  obtenerKpis(): Observable<RespuestaKpi> {
    return this.http.get<RespuestaKpi>(this.urlApi);
  }
}
