import { Injectable } from '@angular/core';
import { Graph, InternalEvent, Cell, UndoManager, RubberBandHandler, PanningHandler, ShapeRegistry, EllipseShape } from '@maxgraph/core';
import type { CellStyle, AbstractCanvas2D } from '@maxgraph/core';
import { TipoNodo } from '../../shared/models/policy.model';
import { GrafoEstadoService } from './grafo-estado.service';

/**
 * Nodo FINAL de actividad UML 2.5: anillo exterior con un punto negro relleno en el centro (◉).
 * Se dibuja extendiendo la elipse: primero el círculo exterior (borde + relleno blanco),
 * luego un círculo interior negro sólido.
 */
class FinalActivityShape extends EllipseShape {
  override paintVertexShape(c: AbstractCanvas2D, x: number, y: number, w: number, h: number): void {
    // Anillo exterior
    c.ellipse(x, y, w, h);
    c.fillAndStroke();
    // Punto negro interior
    const inset = Math.min(w, h) * 0.28;
    c.setFillColor('#000000');
    c.ellipse(x + inset, y + inset, w - 2 * inset, h - 2 * inset);
    c.fill();
  }
}

/** Nombre con el que registramos el shape custom del nodo FIN en maxGraph. */
const SHAPE_FINAL_ACTIVITY = 'finalActivity';
let shapesUmlRegistrados = false;

/** Registra (una sola vez) los shapes UML personalizados en el ShapeRegistry global. */
function registrarShapesUml(): void {
  if (shapesUmlRegistrados) return;
  ShapeRegistry.add(SHAPE_FINAL_ACTIVITY, FinalActivityShape);
  shapesUmlRegistrados = true;
}

/**
 * Responsable de inicializar el grafo maxGraph, cargarlo desde datos existentes
 * y re-parentar nodos cuando se arrastran entre carriles.
 */
@Injectable()
export class GrafoRenderService {

  private onChangeCallback!: () => void;
  private onClickNodoCallback!: (celdaId: string) => void;
  private onSeleccionCambiaCallback!: (haySel: boolean) => void;

  // Interacción del lienzo: zoom, pan, multi-selección
  private rubberBand!: RubberBandHandler;
  private containerEl!: HTMLDivElement;
  private wheelListener!: (e: WheelEvent) => void;
  private keyDownListener!: (e: KeyboardEvent) => void;
  private keyUpListener!: (e: KeyboardEvent) => void;

  constructor(private estado: GrafoEstadoService) {}

  /**
   * Registra los callbacks que el componente necesita reaccionar ante eventos del grafo.
   */
  registrarCallbacks(
    onChange: () => void,
    onClickNodo: (celdaId: string) => void,
    onSeleccionCambia: (haySel: boolean) => void,
  ): void {
    this.onChangeCallback = onChange;
    this.onClickNodoCallback = onClickNodo;
    this.onSeleccionCambiaCallback = onSeleccionCambia;
  }

  inicializar(container: HTMLDivElement): void {
    registrarShapesUml();
    InternalEvent.disableContextMenu(container);
    this.containerEl = container;

    const grafo = new Graph(container);
    grafo.setPanning(true);
    grafo.setTooltips(true);
    grafo.setConnectable(true);
    grafo.setEnabled(this.estado.politica?.estado !== 'PUBLICADA');
    grafo.autoExtend = false;
    grafo.extendParentsOnMove = false;
    // Prevents swimlanes from auto-expanding when a child node is added or moved outside their bounds
    (grafo as any).extendParents = false;
    // Disable Ctrl+drag clone: prevents ghost copies when user ctrl+clicks and drags
    (grafo as any).cloneEnabled = false;

    const edgeStyle = grafo.getStylesheet().getDefaultEdgeStyle();
    edgeStyle.edgeStyle = 'orthogonalEdgeStyle';
    edgeStyle.rounded = true;
    // UML 2.5: punta de flecha abierta (→) sin relleno
    edgeStyle.endArrow = 'open';
    edgeStyle.endFill = false;
    edgeStyle.strokeColor = '#1f2933';
    edgeStyle.fontSize = 11;
    edgeStyle.exitX = undefined;
    edgeStyle.exitY = undefined;
    edgeStyle.entryX = undefined;
    edgeStyle.entryY = undefined;

    this.estado.grafo = grafo;

    // ── UndoManager (Ctrl+Z / Ctrl+Y) ─────────────────────────────────────
    const undoManager = new UndoManager();
    const undoListener = (_sender: any, evt: any) => {
      undoManager.undoableEditHappened(evt.getProperty('edit'));
    };
    grafo.getDataModel().addListener(InternalEvent.UNDO, undoListener);
    grafo.getView().addListener(InternalEvent.UNDO, undoListener);
    this.estado.undoManager = undoManager;

    grafo.getSelectionModel().addListener(InternalEvent.CHANGE, () => {
      this.onSeleccionCambiaCallback(grafo.getSelectionCount() > 0);
    });

    grafo.model.addListener(InternalEvent.CHANGE, () => {
      if (!this.estado.diagramaCargado) return;
      if (this.estado.politica?.estado === 'PUBLICADA') return;
      if (!this.estado.reParentando) {
        requestAnimationFrame(() => this.sincronizarParentsDenodos());
      }
      this.onChangeCallback();
    });

    grafo.addListener(InternalEvent.CLICK, (_sender: any, evt: any) => {
      const celda: Cell = evt.getProperty('cell');
      if (!celda || !celda.isVertex()) {
        this.onClickNodoCallback('');
        return;
      }
      this.onClickNodoCallback(celda.getId() ?? '');
    });

    if (this.estado.politica && this.estado.politica.carriles.length > 0) {
      this.cargarDiagramaExistente();
    } else {
      this.crearEstructuraInicial();
    }

    this.estado.diagramaCargado = true;

    // ── Multi-selección por rubber-band (arrastrar en vacío) ──────────────
    this.rubberBand = new RubberBandHandler(grafo);

    // ── Zoom con rueda del ratón ──────────────────────────────────────────
    this.wheelListener = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        grafo.zoomIn();
      } else {
        grafo.zoomOut();
      }
    };
    container.addEventListener('wheel', this.wheelListener, { passive: false });

    // ── Pan con Espacio + arrastrar (modo "mano") ─────────────────────────
    // Al mantener Espacio se activa el modo pan: cursor grab, arrastre mueve el lienzo.
    // Al soltar, vuelve al modo selección con rubber-band habilitado.
    this.keyDownListener = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const enInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
        if (!enInput) {
          e.preventDefault();
          const ph = grafo.getPlugin<PanningHandler>(PanningHandler.pluginId);
          if (ph) ph.useLeftButtonForPanning = true;
          if (this.rubberBand) this.rubberBand.setEnabled(false);
          container.style.cursor = 'grab';
        }
      }
    };

    this.keyUpListener = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const ph = grafo.getPlugin<PanningHandler>(PanningHandler.pluginId);
        if (ph) ph.useLeftButtonForPanning = false;
        if (this.rubberBand) this.rubberBand.setEnabled(true);
        container.style.cursor = 'default';
      }
    };

    document.addEventListener('keydown', this.keyDownListener);
    document.addEventListener('keyup', this.keyUpListener);
  }

  destruir(): void {
    if (this.containerEl && this.wheelListener) {
      this.containerEl.removeEventListener('wheel', this.wheelListener);
    }
    if (this.keyDownListener) document.removeEventListener('keydown', this.keyDownListener);
    if (this.keyUpListener) document.removeEventListener('keyup', this.keyUpListener);
    if (this.estado.grafo) {
      this.estado.grafo.destroy();
    }
    this.estado.limpiarMaps();
    this.estado.diagramaCargado = false;
    this.estado.undoManager = null;
  }

  private crearEstructuraInicial(): void {
    const { grafo, estado: e } = this;
    const padre = grafo.getDefaultParent();
    grafo.batchUpdate(() => {
      const carrilId = e.generarId();
      const swimlane = grafo.insertVertex(
        padre, carrilId, 'Área Principal',
        0, 0, 200, 600,
        { shape: 'swimlane', horizontal: true, startSize: e.SWIMLANE_HEADER }
      );
      e.celdaPorCarrilId.set(carrilId, swimlane);
      if (e.politica) {
        e.politica.carriles = [{ id: carrilId, nombre: 'Área Principal', orden: 0, horizontal: true }];
      }
    });
  }

  cargarDiagramaExistente(): void {
    const { grafo, estado: e } = this;
    if (!e.politica) return;
    const padre = grafo.getDefaultParent();

    grafo.batchUpdate(() => {
      e.politica!.carriles.forEach((carril, idx) => {
        const esColumna = carril.horizontal === true;
        const x     = carril.posX  ?? (esColumna ? idx * 200 : 0);
        const y     = carril.posY  ?? (esColumna ? 0 : idx * 200);
        const ancho = carril.ancho ?? (esColumna ? 200 : 800);
        const alto  = carril.alto  ?? (esColumna ? 600 : 200);
        const swimlane = grafo.insertVertex(
          padre, carril.id, carril.nombre, x, y, ancho, alto,
          { shape: 'swimlane', horizontal: esColumna, startSize: e.SWIMLANE_HEADER }
        );
        e.celdaPorCarrilId.set(carril.id, swimlane);
      });

      e.politica!.nodos.forEach((nodo) => {
        const celda = e.celdaPorCarrilId.get(nodo.carrilId) ?? padre;
        const vertex = grafo.insertVertex(
          celda, nodo.id, nodo.etiqueta,
          nodo.posX, nodo.posY, nodo.ancho, nodo.alto,
          this.estiloParaTipo(nodo.tipo)
        );
        e.celdaPorNodoId.set(nodo.id, vertex);
      });

      e.politica!.conexiones.forEach((conexion) => {
        const origen  = e.celdaPorNodoId.get(conexion.nodoOrigenId);
        const destino = e.celdaPorNodoId.get(conexion.nodoDestinoId);
        if (origen && destino) {
          grafo.insertEdge(padre, conexion.id, conexion.etiqueta ?? '', origen, destino);
        }
      });
    });
  }

  sincronizarParentsDenodos(): void {
    const e = this.estado;
    if (e.reParentando || !e.politica) return;

    const startSize = e.SWIMLANE_HEADER;
    const defaultParentId = e.grafo.getDefaultParent().getId();

    const cambios: Array<{
      celda: Cell;
      nuevoParent: Cell;
      nuevoCarrilId: string;
      newX: number;
      newY: number;
    }> = [];

    e.celdaPorNodoId.forEach((celda) => {
      if (!celda.geometry || !celda.parent) return;
      const parentId = celda.parent.getId();
      if (!parentId) return;

      const enSwimlane = e.celdaPorCarrilId.has(parentId);
      const enDefaultParent = parentId === defaultParentId;
      if (!enSwimlane && !enDefaultParent) return;

      let absX: number;
      let absY: number;

      if (enSwimlane) {
        const parentGeo = celda.parent.geometry!;
        absX = parentGeo.x + celda.geometry.x;
        absY = parentGeo.y + startSize + celda.geometry.y;
      } else {
        absX = celda.geometry.x;
        absY = celda.geometry.y;
      }

      const absCX = absX + celda.geometry.width / 2;
      const absCY = absY + celda.geometry.height / 2;

      for (const [carrilId, swimlane] of e.celdaPorCarrilId) {
        if (carrilId === parentId) continue;
        const sg = swimlane.geometry;
        if (!sg) continue;
        if (absCX >= sg.x && absCX <= sg.x + sg.width &&
            absCY >= sg.y && absCY <= sg.y + sg.height) {
          cambios.push({
            celda,
            nuevoParent: swimlane,
            nuevoCarrilId: carrilId,
            newX: absX - sg.x,
            newY: absY - sg.y - startSize,
          });
          break;
        }
      }
    });

    if (cambios.length === 0) return;

    e.reParentando = true;
    e.grafo.batchUpdate(() => {
      cambios.forEach(({ celda, nuevoParent, nuevoCarrilId, newX, newY }) => {
        const idx = nuevoParent.getChildCount();
        e.grafo.model.add(nuevoParent, celda, idx);
        const newGeo = celda.geometry!.clone();
        newGeo.x = newX;
        newGeo.y = newY;
        e.grafo.model.setGeometry(celda, newGeo);
        const nodoId = celda.getId();
        if (nodoId) {
          const nodo = e.politica!.nodos.find((n) => n.id === nodoId);
          if (nodo) nodo.carrilId = nuevoCarrilId;
        }
      });
    });
    e.reParentando = false;
  }

  // ── Utilidades de estilo ──────────────────────────────────────────────

  estiloParaTipo(tipo: TipoNodo): CellStyle {
    // Etiqueta debajo del nodo (para nodos de control pequeños: inicio, fin, barras fork/join)
    const etiquetaAbajo: CellStyle = {
      verticalLabelPosition: 'bottom',
      verticalAlign: 'top',
      fontColor: '#1f2933',
      fontSize: 12,
    };

    const estilos: Record<TipoNodo, CellStyle> = {
      // ● Nodo inicial UML: círculo negro sólido
      INICIO: {
        shape: 'ellipse',
        fillColor: '#000000',
        strokeColor: '#000000',
        ...etiquetaAbajo,
      },
      // ◉ Nodo final de actividad UML: anillo exterior + punto negro (shape custom)
      FIN: {
        shape: SHAPE_FINAL_ACTIVITY,
        fillColor: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 1.5,
        ...etiquetaAbajo,
      },
      // ▭ Acción/Actividad UML: rectángulo redondeado, fondo claro
      ACTIVIDAD: {
        rounded: true,
        arcSize: 18,
        fillColor: '#ffffff',
        strokeColor: '#1f2933',
        fontColor: '#1f2933',
        fontSize: 12,
      },
      // ◇ Decisión/Merge UML: rombo blanco con borde negro
      DECISION: {
        shape: 'rhombus',
        fillColor: '#ffffff',
        strokeColor: '#1f2933',
        fontColor: '#1f2933',
        fontSize: 11,
      },
      // ▬ Bifurcación (fork) UML: barra negra gruesa
      COMPUERTA_PARALELA: {
        shape: 'rectangle',
        rounded: false,
        fillColor: '#000000',
        strokeColor: '#000000',
        ...etiquetaAbajo,
      },
      // ▬ Unión (join) UML: barra negra gruesa (idéntica a fork)
      COMPUERTA_UNION: {
        shape: 'rectangle',
        rounded: false,
        fillColor: '#000000',
        strokeColor: '#000000',
        ...etiquetaAbajo,
      },
    };
    return estilos[tipo] ?? {};
  }

  dimensionesParaTipo(tipo: TipoNodo): { ancho: number; alto: number } {
    if (tipo === 'INICIO' || tipo === 'FIN') return { ancho: 30, alto: 30 };
    if (tipo === 'DECISION') return { ancho: 70, alto: 50 };
    // Barras fork/join: rectángulo delgado horizontal
    if (tipo === 'COMPUERTA_PARALELA' || tipo === 'COMPUERTA_UNION') return { ancho: 120, alto: 10 };
    return { ancho: 120, alto: 50 };
  }

  private get grafo(): Graph {
    return this.estado.grafo;
  }
}
