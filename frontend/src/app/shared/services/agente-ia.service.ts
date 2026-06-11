import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RecomendacionPolitica {
  politicaId: string;
  nombre: string;
  score: number;
  confianza: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface MensajeAgente {
  role: 'user' | 'assistant';
  content: string;
}

export interface RespuestaAgente {
  respuesta: string;
  recomendacion?: RecomendacionPolitica | null;
  alternativas?: RecomendacionPolitica[];
  sugiereAsesor: boolean;
  promptTranscrito?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AgenteIaService {
  private readonly urlApi = `${environment.apiUrl}/api/agente`;

  constructor(private http: HttpClient) {}

  consultar(mensaje: string, historial: MensajeAgente[] = []): Observable<RespuestaAgente> {
    return this.http.post<RespuestaAgente>(`${this.urlApi}/consulta`, { mensaje, historial });
  }

  consultarAudio(audio: Blob, historial: MensajeAgente[] = []): Observable<RespuestaAgente> {
    const formData = new FormData();
    formData.append('audio', audio, 'consulta.webm');
    formData.append('historial', JSON.stringify(historial));
    return this.http.post<RespuestaAgente>(`${this.urlApi}/consulta-audio`, formData);
  }
}
