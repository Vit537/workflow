import { Injectable } from '@angular/core';
import { Graph, Cell, UndoManager } from '@maxgraph/core';
import { Politica } from '../../shared/models/policy.model';

/**
 * Estado compartido del grafo entre todos los servicios del editor.
 * Actúa como fuente de verdad para el grafo maxGraph y los mapas de celdas.
 */
@Injectable()
export class GrafoEstadoService {
  grafo!: Graph;

  /** Map nodoId → Cell de maxGraph */
  celdaPorNodoId = new Map<string, Cell>();

  /** Map carrilId → Cell de maxGraph */
  celdaPorCarrilId = new Map<string, Cell>();

  /** Guard para evitar recursión infinita al re-parentar nodos entre carriles */
  reParentando = false;

  /** Evita disparar auto-guardado mientras se carga el diagrama inicial */
  diagramaCargado = false;

  /** La política actualmente abierta en el editor */
  politica: Politica | null = null;

  readonly SWIMLANE_HEADER = 30; // startSize del swimlane en px

  /** Gestor de historial para Ctrl+Z / Ctrl+Y */
  undoManager: UndoManager | null = null;

  /** Celdas copiadas con Ctrl+C para pegar con Ctrl+V */
  celdasCopiadas: Cell[] = [];

  generarId(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  limpiarMaps(): void {
    this.celdaPorNodoId.clear();
    this.celdaPorCarrilId.clear();
    this.celdasCopiadas = [];
  }
}
