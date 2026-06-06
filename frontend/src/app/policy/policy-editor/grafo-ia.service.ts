import { Injectable } from '@angular/core';
import { Nodo, TipoNodo, TipoFlujo, Carril } from '../../shared/models/policy.model';
import { DiagramaIA, AccionIA, ConexionIA } from '../../shared/services/ia.service';
import { GrafoEstadoService } from './grafo-estado.service';
import { GrafoRenderService } from './grafo-render.service';

/**
 * Encapsula la lógica de aplicar diagramas y acciones generados por IA
 * sobre el estado del grafo (GrafoEstadoService).
 *
 * No maneja re-renderizado: el componente padre es responsable de destruir
 * e inicializar el grafo tras llamar a estos métodos.
 */
@Injectable()
export class GrafoIaService {

  constructor(
    private estado: GrafoEstadoService,
    private render: GrafoRenderService,
  ) {}

  private generarId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  // ── Layout automático ─────────────────────────────────────────────────

  aplicarLayoutAutomatico(orientacion: string): void {
    const politica = this.estado.politica;
    if (!politica) return;

    // Default to column (vertical) layout; only use horizontal when explicitly requested
    const esColumna = orientacion === 'horizontal' ? false : true;

    const PADDING_X = 40;
    const PADDING_Y = 50;
    const GAP_X = 160;
    const GAP_Y = 110;

    if (!esColumna) {
      // Fila (horizontal): nodos van de izquierda a derecha dentro de cada carril
      const colPorCarril = new Map<string, number>();
      politica.carriles.forEach(c => colPorCarril.set(c.id, 0));

      politica.nodos.forEach(nodo => {
        const col = colPorCarril.get(nodo.carrilId) ?? 0;
        colPorCarril.set(nodo.carrilId, col + 1);
        nodo.posX = PADDING_X + col * GAP_X;
        nodo.posY = PADDING_Y;
      });
    } else {
      // Columna (vertical): nodos van de arriba a abajo dentro de cada carril
      const rowPorCarril = new Map<string, number>();
      politica.carriles.forEach(c => rowPorCarril.set(c.id, 0));

      politica.nodos.forEach(nodo => {
        const row = rowPorCarril.get(nodo.carrilId) ?? 0;
        rowPorCarril.set(nodo.carrilId, row + 1);
        nodo.posX = PADDING_X;
        nodo.posY = PADDING_Y + row * GAP_Y;
      });
    }
  }

  // ── Aplicar diagrama completo (modo CREAR) ────────────────────────────

  aplicarDiagrama(diagrama: DiagramaIA): void {
    const politica = this.estado.politica;
    if (!politica) return;

    // Column layout: each carril is a vertical column (horizontal = true)
    // Nodes within each carril are stacked from top to bottom
    const PADDING_X = 40;
    const PADDING_Y = 50;
    const GAP_Y = 110;

    const rowPorCarril = new Map<string, number>();
    diagrama.carriles.forEach((c) => rowPorCarril.set(c.id, 0));

    const nodosConPosicion = diagrama.nodos.map((n) => {
      const row = rowPorCarril.get(n.carrilId) ?? 0;
      rowPorCarril.set(n.carrilId, row + 1);
      const { ancho, alto } = this.render.dimensionesParaTipo(n.tipo as TipoNodo);
      return {
        ...n,
        posX: PADDING_X,
        posY: PADDING_Y + row * GAP_Y,
        ancho,
        alto,
      };
    });

    politica.carriles = [];
    politica.nodos = [];
    politica.conexiones = [];

    diagrama.carriles.forEach((c, i) => {
      // Always create as column (horizontal:true) — vertical swimlane columns
      politica.carriles.push({ id: c.id, nombre: c.nombre, orden: i, horizontal: true } as Carril);
    });

    nodosConPosicion.forEach((n) => {
      politica.nodos.push({
        id: n.id,
        etiqueta: n.etiqueta,
        tipo: n.tipo as TipoNodo,
        tipoFlujo: (n.tipoFlujo as TipoFlujo) ?? 'LINEAL',
        condiciones: (n as any).condiciones ?? [],
        posX: n.posX,
        posY: n.posY,
        ancho: n.ancho,
        alto: n.alto,
        carrilId: n.carrilId,
        formulario: n.formulario ? {
          titulo: n.formulario.titulo,
          instrucciones: n.formulario.instrucciones ?? '',
          requisitos: n.formulario.requisitos ?? [],
          campos: (n.formulario.campos ?? []).map(c => ({
            nombre: c.nombre,
            etiqueta: c.etiqueta,
            tipoCampo: c.tipoCampo,
            requerido: c.requerido ?? false,
          })),
        } : undefined,
      });
    });

    diagrama.conexiones.forEach((cx: ConexionIA) => {
      politica.conexiones.push({
        id: cx.id,
        nodoOrigenId: cx.nodoOrigenId,
        nodoDestinoId: cx.nodoDestinoId,
        etiqueta: cx.etiqueta ?? '',
      });
    });

    this.estado.politica = politica;
  }

  // ── Ejecutar acciones (modo EDITAR) ───────────────────────────────────

  ejecutarAcciones(acciones: AccionIA[]): void {
    const politica = this.estado.politica;
    if (!politica) return;

    const PADDING_X = 40;
    const PADDING_Y = 50;
    const GAP_Y = 110;

    for (const accion of acciones) {
      switch (accion.tipo) {

        case 'AGREGAR_CARRIL': {
          const nombre: string = accion.datos['nombre'] ?? 'Nuevo carril';
          // No crear si ya existe un carril con ese nombre (comparación sin distinguir mayúsculas)
          const yaExiste = politica.carriles.some(
            c => c.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
          );
          if (yaExiste) break;
          const orden = politica.carriles.length;
          politica.carriles.push({ id: this.generarId(), nombre, orden, horizontal: true } as Carril);
          break;
        }

        case 'AGREGAR_NODO': {
          const carrilNombre: string = accion.datos['carrilNombre'] ?? '';
          const carril = politica.carriles.find(c => c.nombre === carrilNombre)
            ?? politica.carriles[0];
          if (!carril) break;
          const nodoIdx = politica.nodos.filter(n => n.carrilId === carril.id).length;
          const tipo = (accion.datos['tipo'] ?? 'ACTIVIDAD') as TipoNodo;
          const { ancho, alto } = this.render.dimensionesParaTipo(tipo);
          politica.nodos.push({
            id: this.generarId(),
            etiqueta: accion.datos['etiqueta'] ?? 'Nuevo nodo',
            tipo,
            tipoFlujo: (accion.datos['tipoFlujo'] ?? 'LINEAL') as TipoFlujo,
            condiciones: accion.datos['condiciones'] ?? [],
            posX: PADDING_X,
            posY: PADDING_Y + nodoIdx * GAP_Y,
            ancho,
            alto,
            carrilId: carril.id,
            formulario: accion.datos['formulario'] ? {
              titulo: accion.datos['formulario'].titulo,
              instrucciones: accion.datos['formulario'].instrucciones ?? '',
              requisitos: accion.datos['formulario'].requisitos ?? [],
              campos: (accion.datos['formulario'].campos ?? []).map((c: any) => ({
                nombre: c.nombre,
                etiqueta: c.etiqueta,
                tipoCampo: c.tipoCampo,
                requerido: c.requerido ?? false,
              })),
            } : undefined,
          });
          break;
        }

        case 'AGREGAR_CONEXION': {
          const origen = politica.nodos.find(n => n.etiqueta === accion.datos['nodoOrigenEtiqueta']);
          const destino = politica.nodos.find(n => n.etiqueta === accion.datos['nodoDestinoEtiqueta']);
          if (origen && destino) {
            politica.conexiones.push({
              id: this.generarId(),
              nodoOrigenId: origen.id,
              nodoDestinoId: destino.id,
              etiqueta: accion.datos['etiqueta'] ?? '',
            });
          }
          break;
        }

        case 'ELIMINAR_NODO': {
          const nodo = politica.nodos.find(n => n.etiqueta === accion.datos['etiqueta']);
          if (!nodo) break;
          politica.conexiones = politica.conexiones.filter(
            c => c.nodoOrigenId !== nodo.id && c.nodoDestinoId !== nodo.id
          );
          politica.nodos = politica.nodos.filter(n => n.id !== nodo.id);
          break;
        }

        case 'ELIMINAR_CARRIL': {
          const carril = politica.carriles.find(c => c.nombre === accion.datos['nombre']);
          if (!carril) break;
          const idsNodosCarril = politica.nodos
            .filter(n => n.carrilId === carril.id).map(n => n.id);
          politica.conexiones = politica.conexiones.filter(
            c => !idsNodosCarril.includes(c.nodoOrigenId) && !idsNodosCarril.includes(c.nodoDestinoId)
          );
          politica.nodos = politica.nodos.filter(n => n.carrilId !== carril.id);
          politica.carriles = politica.carriles.filter(c => c.id !== carril.id);
          politica.carriles.forEach((c, i) => c.orden = i);
          break;
        }

        case 'ELIMINAR_CONEXION': {
          const origen = politica.nodos.find(n => n.etiqueta === accion.datos['nodoOrigenEtiqueta']);
          const destino = politica.nodos.find(n => n.etiqueta === accion.datos['nodoDestinoEtiqueta']);
          if (origen && destino) {
            politica.conexiones = politica.conexiones.filter(
              c => !(c.nodoOrigenId === origen.id && c.nodoDestinoId === destino.id)
            );
          }
          break;
        }

        case 'EDITAR_NODO': {
          const nodo = politica.nodos.find(n => n.etiqueta === accion.datos['etiqueta']);
          if (!nodo) break;
          if (accion.datos['nuevoNombre']) nodo.etiqueta = accion.datos['nuevoNombre'];
          if (accion.datos['tipoFlujo'])  nodo.tipoFlujo = accion.datos['tipoFlujo'] as TipoFlujo;
          break;
        }

        case 'EDITAR_CARRIL': {
          const carril = politica.carriles.find(c => c.nombre === accion.datos['nombre']);
          if (!carril) break;
          if (accion.datos['nuevoNombre']) carril.nombre = accion.datos['nuevoNombre'];
          break;
        }

        case 'REORDENAR_DIAGRAMA': {
          this.aplicarLayoutAutomatico(accion.datos['orientacion'] ?? 'auto');
          break;
        }

        case 'CAMBIAR_ORIENTACION': {
          const nuevaOrientacion: string = accion.datos['orientacion'] ?? 'horizontal';
          const esColumna = nuevaOrientacion === 'vertical';
          politica.carriles.forEach(c => c.horizontal = esColumna);
          this.aplicarLayoutAutomatico(nuevaOrientacion);
          break;
        }
      }
    }

    this.estado.politica = politica;
  }
}
