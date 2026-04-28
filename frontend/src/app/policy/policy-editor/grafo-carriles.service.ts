import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Carril, Nodo, TipoNodo } from '../../shared/models/policy.model';
import { GrafoEstadoService } from './grafo-estado.service';
import { GrafoRenderService } from './grafo-render.service';

/**
 * Gestiona las operaciones CRUD de carriles y nodos:
 * agregar, editar, eliminar.
 */
@Injectable()
export class GrafoCarrilesService {

  constructor(
    private estado: GrafoEstadoService,
    private render: GrafoRenderService,
    private snackBar: MatSnackBar,
  ) {}

  agregarNodo(tipo: TipoNodo, etiqueta: string): void {
    const e = this.estado;
    if (!e.politica || e.politica.carriles.length === 0) {
      this.snackBar.open('Añade al menos un carril primero', 'Cerrar', { duration: 2500 });
      return;
    }

    const primerCarril = e.politica.carriles[0];
    const celdaCarril  = e.celdaPorCarrilId.get(primerCarril.id);
    if (!celdaCarril) return;

    const nodoId = e.generarId();
    const { ancho, alto } = this.render.dimensionesParaTipo(tipo);
    // Clamp position so the node stays fully inside the swimlane
    const swW = celdaCarril.geometry?.width  ?? 200;
    const swH = celdaCarril.geometry?.height ?? 600;
    const posX = Math.max(10, Math.min(10 + Math.random() * 100, swW - ancho - 10));
    const posY = Math.max(e.SWIMLANE_HEADER + 10, Math.min(e.SWIMLANE_HEADER + 10 + Math.random() * 80, swH - alto - 10));

    e.grafo.batchUpdate(() => {
      const vertex = e.grafo.insertVertex(
        celdaCarril, nodoId, etiqueta, posX, posY, ancho, alto,
        this.render.estiloParaTipo(tipo)
      );
      e.celdaPorNodoId.set(nodoId, vertex);
    });

    const nuevoNodo: Nodo = {
      id: nodoId,
      carrilId: primerCarril.id,
      etiqueta,
      tipo,
      tipoFlujo: 'LINEAL',
      posX,
      posY,
      ancho,
      alto,
      condiciones: [],
    };
    e.politica.nodos.push(nuevoNodo);
  }

  agregarCarril(formularioCarril: FormGroup, carrilEditando: Carril | null): Carril | null {
    const e = this.estado;
    if (formularioCarril.invalid || !e.politica) return carrilEditando;

    const nombre: string = formularioCarril.value.nombre;
    const esColumna: boolean = formularioCarril.value.orientacion === 'columna';

    // ── MODO EDICIÓN ──────────────────────────────────────────────────
    if (carrilEditando) {
      const carril = carrilEditando;
      carril.nombre = nombre;
      const orientacionCambio = carril.horizontal !== esColumna;
      carril.horizontal = esColumna;

      const celdaCarril = e.celdaPorCarrilId.get(carril.id);
      if (celdaCarril) {
        e.grafo.batchUpdate(() => {
          e.grafo.model.setValue(celdaCarril, nombre);
          if (orientacionCambio) {
            const geo = celdaCarril.geometry!.clone();
            geo.width  = esColumna ? 200 : 800;
            geo.height = esColumna ? 600 : 200;
            e.grafo.model.setGeometry(celdaCarril, geo);
            e.grafo.model.setStyle(celdaCarril, {
              shape: 'swimlane',
              horizontal: esColumna,
              startSize: e.SWIMLANE_HEADER,
            });
          }
        });
      }
      return null; // carrilEditando reseteado
    }

    // ── MODO CREACIÓN ─────────────────────────────────────────────────
    const orden   = e.politica.carriles.length;
    const carrilId = e.generarId();
    const padre   = e.grafo.getDefaultParent();
    const x     = esColumna ? orden * 200 : 0;
    const y     = esColumna ? 0 : orden * 200;
    const ancho = esColumna ? 200 : 800;
    const alto  = esColumna ? 600 : 200;

    e.grafo.batchUpdate(() => {
      const swimlane = e.grafo.insertVertex(
        padre, carrilId, nombre, x, y, ancho, alto,
        { shape: 'swimlane', horizontal: esColumna, startSize: e.SWIMLANE_HEADER }
      );
      e.celdaPorCarrilId.set(carrilId, swimlane);
    });

    e.politica.carriles.push({ id: carrilId, nombre, orden, horizontal: esColumna });
    return null; // carrilEditando sigue en null
  }

  editarCarril(carril: Carril, formularioCarril: FormGroup): void {
    if (this.estado.politica?.estado === 'PUBLICADA') return;
    formularioCarril.setValue({
      nombre: carril.nombre,
      orientacion: carril.horizontal === true ? 'columna' : 'fila',
    });
  }

  // ── CU: Copiar / Pegar ────────────────────────────────────────────────

  copiarSeleccion(): void {
    const e = this.estado;
    if (!e.grafo) return;
    const celdas = e.grafo.getSelectionCells();
    // Solo nodos (no carriles, no aristas)
    e.celdasCopiadas = celdas.filter(
      (c) => c.isVertex() && !e.celdaPorCarrilId.has(c.getId() ?? '')
    );
    if (e.celdasCopiadas.length > 0) {
      this.snackBar.open(
        `${e.celdasCopiadas.length} elemento(s) copiado(s). Usa Ctrl+V para pegar.`,
        'Cerrar',
        { duration: 2000 }
      );
    }
  }

  pegarSeleccion(): void {
    const e = this.estado;
    if (!e.grafo || e.celdasCopiadas.length === 0 || !e.politica) return;
    if (e.politica.estado === 'PUBLICADA') return;

    const offset = 30;
    const nuevasCeldas: any[] = [];

    e.grafo.batchUpdate(() => {
      e.celdasCopiadas.forEach((celda) => {
        const geo = celda.geometry;
        if (!geo) return;

        const nuevoId = e.generarId();
        // Mantener el mismo carril padre si existe
        const parentId = celda.parent?.getId();
        const parent =
          parentId && e.celdaPorCarrilId.has(parentId)
            ? celda.parent!
            : e.grafo.getDefaultParent();

        const vertex = e.grafo.insertVertex(
          parent,
          nuevoId,
          typeof celda.value === 'string' ? celda.value : String(celda.value ?? ''),
          geo.x + offset,
          geo.y + offset,
          geo.width,
          geo.height,
          celda.style ? { ...celda.style } : {}
        );
        e.celdaPorNodoId.set(nuevoId, vertex);
        nuevasCeldas.push(vertex);

        // Clonar el nodo en politica.nodos con el nuevo ID
        const nodoOriginal = e.politica!.nodos.find((n) => n.id === celda.getId());
        if (nodoOriginal) {
          e.politica!.nodos.push({
            ...nodoOriginal,
            id: nuevoId,
            posX: geo.x + offset,
            posY: geo.y + offset,
          });
        }
      });
    });

    if (nuevasCeldas.length > 0) {
      e.grafo.setSelectionCells(nuevasCeldas);
    }
  }

  eliminarSeleccion(
    nodoSeleccionadoId: string | null,
    onSeleccionBorrada: () => void,
    guardarInmediato: () => void,
    programarAutoGuardado: () => void,
  ): string | null {
    const e = this.estado;
    if (!e.grafo || e.politica?.estado === 'PUBLICADA') return nodoSeleccionadoId;

    const celdas = e.grafo.getSelectionCells();
    if (!celdas || celdas.length === 0) return nodoSeleccionadoId;

    const idsCarrilesAEliminar: string[] = [];
    const idsNodosAEliminar: string[] = [];

    celdas.forEach((celda) => {
      const id = celda.getId();
      if (!id || !celda.isVertex()) return;

      if (e.celdaPorCarrilId.has(id)) {
        idsCarrilesAEliminar.push(id);
        (e.politica?.nodos ?? [])
          .filter((n) => n.carrilId === id)
          .forEach((n) => idsNodosAEliminar.push(n.id));
      } else {
        idsNodosAEliminar.push(id);
      }
    });

    e.grafo.batchUpdate(() => {
      e.grafo.removeCells(celdas);
    });

    idsCarrilesAEliminar.forEach((id) => e.celdaPorCarrilId.delete(id));
    idsNodosAEliminar.forEach((id)   => e.celdaPorNodoId.delete(id));

    if (e.politica) {
      const setCarriles = new Set(idsCarrilesAEliminar);
      const setNodos    = new Set(idsNodosAEliminar);
      e.politica.carriles = e.politica.carriles.filter((c) => !setCarriles.has(c.id));
      e.politica.nodos    = e.politica.nodos.filter((n) => !setNodos.has(n.id));
    }

    onSeleccionBorrada();
    this.snackBar.open('Elemento(s) eliminado(s).', 'Cerrar', { duration: 2000 });

    const hayCarrilesEliminados = idsCarrilesAEliminar.length > 0;

    if (hayCarrilesEliminados) {
      guardarInmediato();
    } else {
      programarAutoGuardado();
    }

    // Retorna el nodo seleccionado resultante (null si fue eliminado)
    if (nodoSeleccionadoId && !e.celdaPorNodoId.has(nodoSeleccionadoId)) {
      return null;
    }
    return nodoSeleccionadoId;
  }
}
