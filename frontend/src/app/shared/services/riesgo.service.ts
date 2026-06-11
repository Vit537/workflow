import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AtencionNivel {
  tramitesActivos: number;
  asesoresActivos: number;
  ratio: number;
  nivel: 'ALTA' | 'MEDIA' | 'BAJA';
  sugerirIA: boolean;
}

export interface PanelItem {
  tramiteId: string;
  nombrePolitica: string;
  etiquetaNodo: string;
  carrilNombre: string;
  asignadoA: string;
  nombreCliente: string;
  probabilidadDemora: number;
  riesgoDemora: 'ALTO' | 'MEDIO' | 'BAJO';
  scorePrioridad: number;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  esAnomalia: boolean;
  fuente: string;
}

export interface PanelRiesgo {
  atencion: AtencionNivel;
  items: PanelItem[];
}

export interface EstadoEntrenamiento {
  estado: 'IDLE' | 'ENTRENANDO' | 'OK' | 'ERROR';
  mensaje: string;
  metricas?: { accuracyDemora?: number; maeDuracionHoras?: number; muestras?: number };
  fecha?: string | null;
  tramites?: number;
}

@Injectable({ providedIn: 'root' })
export class RiesgoService {
  private readonly urlApi = `${environment.apiUrl}/api/riesgo`;

  constructor(private http: HttpClient) {}

  /** Panel del administrador: cola priorizada + nivel de atención (modelos TensorFlow). */
  panel(): Observable<PanelRiesgo> {
    return this.http.get<PanelRiesgo>(`${this.urlApi}/panel`);
  }

  /** Lanza el reentrenamiento de los modelos (admin). */
  entrenar(): Observable<EstadoEntrenamiento> {
    return this.http.post<EstadoEntrenamiento>(`${this.urlApi}/entrenar`, {});
  }

  /** Estado del entrenamiento. */
  estadoEntrenamiento(): Observable<EstadoEntrenamiento> {
    return this.http.get<EstadoEntrenamiento>(`${this.urlApi}/entrenar/estado`);
  }
}
