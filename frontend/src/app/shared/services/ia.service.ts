import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoNodo, TipoCampo } from '../models/policy.model';
import { environment } from '../../../environments/environment';

export interface CampoIA {
  nombre: string;
  etiqueta: string;
  tipoCampo: TipoCampo;
  requerido: boolean;
}

export interface FormularioIA {
  titulo: string;
  instrucciones: string;
  requisitos: string[];
  campos: CampoIA[];
}

export interface CarrilIA {
  id: string;
  nombre: string;
  orden: number;
}

export interface NodoIA {
  id: string;
  etiqueta: string;
  tipo: TipoNodo;
  tipoFlujo?: string;
  posX: number;
  posY: number;
  ancho: number;
  alto: number;
  carrilId: string;
  condiciones?: string[];
  formulario?: FormularioIA | null;
}

export interface ConexionIA {
  id: string;
  nodoOrigenId: string;
  nodoDestinoId: string;
  etiqueta?: string;
}

export interface DiagramaIA {
  carriles: CarrilIA[];
  nodos: NodoIA[];
  conexiones: ConexionIA[];
}

export interface AccionIA {
  tipo: string; // AGREGAR_CARRIL | AGREGAR_NODO | AGREGAR_CONEXION | ELIMINAR_CARRIL | ELIMINAR_NODO | ELIMINAR_CONEXION | EDITAR_NODO | EDITAR_CARRIL
  datos: Record<string, any>;
}

export interface RespuestaIA {
  modo: string;           // 'CREAR' | 'EDITAR'
  diagrama?: DiagramaIA;  // solo en modo CREAR
  acciones?: AccionIA[];  // solo en modo EDITAR
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly urlApi = `${environment.apiUrl}/api/ia`;

  constructor(private http: HttpClient) {}

  generarDiagrama(prompt: string, diagramaActual?: DiagramaIA | null): Observable<RespuestaIA> {
    return this.http.post<RespuestaIA>(`${this.urlApi}/generar-diagrama`, {
      prompt,
      diagramaActual: diagramaActual ?? null,
    });
  }
}
