import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ResultadoReporte {
  titulo: string;
  descripcion: string;
  columnas: string[];
  filas: Record<string, any>[];
  esKPI?: boolean;
  descripcionKPI?: string | null;
  promptTranscrito?: string | null;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly urlApi = `${environment.apiUrl}/api/reportes`;

  constructor(private http: HttpClient) {}

  generarDesdeTexto(prompt: string): Observable<ResultadoReporte> {
    return this.http.post<ResultadoReporte>(`${this.urlApi}/generar`, { prompt });
  }

  generarDesdeAudio(audioBlob: Blob, filename: string): Observable<ResultadoReporte> {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);
    return this.http.post<ResultadoReporte>(`${this.urlApi}/generar-audio`, formData);
  }

  exportarExcel(reporte: ResultadoReporte): Observable<Blob> {
    return this.http.post(`${this.urlApi}/exportar/excel`, reporte, {
      responseType: 'blob',
    });
  }

  exportarPdf(reporte: ResultadoReporte): Observable<Blob> {
    return this.http.post(`${this.urlApi}/exportar/pdf`, reporte, {
      responseType: 'blob',
    });
  }
}
