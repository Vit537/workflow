import { Injectable } from '@angular/core';
import { Cell } from '@maxgraph/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PoliticaService, SolicitudActualizarDiagrama } from '../../shared/services/politica.service';
import { Politica } from '../../shared/models/policy.model';
import { GrafoEstadoService } from './grafo-estado.service';

/**
 * Responsable de sincronizar el estado del grafo con el backend:
 * sincronización de geometrías, recopilación de aristas y persistencia.
 */
@Injectable()
export class GrafoGuardarService {

  constructor(
    private estado: GrafoEstadoService,
    private politicaService: PoliticaService,
    private snackBar: MatSnackBar,
  ) {}

  /**
   * Persiste el diagrama actual en el backend.
   * @param silencioso Si true, no muestra snackbar ni sobreescribe toda la política.
   * @param onSuccess Callback con la política devuelta por el backend.
   * @param onError Callback de error.
   */
  guardar(
    silencioso: boolean,
    onSuccess: (p: Politica) => void,
    onError: () => void,
  ): void {
    const e = this.estado;
    if (!e.politica) return;

    // 1. Sincronizar posiciones de CARRILES
    e.politica.carriles.forEach((carril) => {
      const celdaCarril = e.celdaPorCarrilId.get(carril.id);
      if (celdaCarril?.geometry) {
        carril.posX  = celdaCarril.geometry.x;
        carril.posY  = celdaCarril.geometry.y;
        carril.ancho = celdaCarril.geometry.width;
        carril.alto  = celdaCarril.geometry.height;
      }
    });

    // 1b. Eliminar carriles que ya no existen en los Maps
    e.politica.carriles = e.politica.carriles.filter((c) => e.celdaPorCarrilId.has(c.id));

    // 2. Sincronizar posiciones de NODOS y carrilId
    e.politica.nodos.forEach((nodo) => {
      const celda = e.celdaPorNodoId.get(nodo.id);
      if (!celda?.geometry) return;
      nodo.posX  = celda.geometry.x;
      nodo.posY  = celda.geometry.y;
      nodo.ancho = celda.geometry.width;
      nodo.alto  = celda.geometry.height;
      const parentId = celda.parent?.getId();
      if (parentId && e.celdaPorCarrilId.has(parentId)) {
        nodo.carrilId = parentId;
      }
    });

    // 3. Eliminar nodos que hayan sido borrados del grafo
    e.politica.nodos = e.politica.nodos.filter((nodo) => e.celdaPorNodoId.has(nodo.id));

    // 4. Recopilar TODAS las aristas recursivamente
    const recopilarAristas = (celda: Cell): Cell[] => {
      const aristas: Cell[] = [];
      (celda.children ?? []).forEach((hijo) => {
        if (hijo.isEdge() && hijo.source && hijo.target) aristas.push(hijo);
        aristas.push(...recopilarAristas(hijo));
      });
      return aristas;
    };
    const padre = e.grafo.getDefaultParent();
    const todasLasAristas = recopilarAristas(padre);
    e.politica.conexiones = todasLasAristas.map((c) => {
      const existente = e.politica!.conexiones.find((cx) => cx.id === c.getId());
      return {
        id: c.getId() ?? e.generarId(),
        nodoOrigenId:  c.source!.getId()!,
        nodoDestinoId: c.target!.getId()!,
        etiqueta: existente?.etiqueta ?? (typeof c.value === 'string' ? c.value : ''),
        condicion: existente?.condicion,
      };
    });

    const solicitud: SolicitudActualizarDiagrama = {
      carriles:   e.politica.carriles,
      nodos:      e.politica.nodos,
      conexiones: e.politica.conexiones,
    };

    this.politicaService.actualizarDiagrama(e.politica.id, solicitud).subscribe({
      next: (p) => {
        console.log('[guardarDiagrama] respuesta del backend:',
          JSON.stringify({ carriles: p.carriles?.map((c: any) => c.nombre) })
        );
        onSuccess(p);
        if (!silencioso) {
          this.snackBar.open('Diagrama guardado', 'Cerrar', { duration: 2000 });
        }
      },
      error: () => {
        onError();
        if (!silencioso) {
          this.snackBar.open('Error al guardar el diagrama', 'Cerrar', { duration: 3000 });
        }
      },
    });
  }

  /** Valida el diagrama para publicar. Retorna errores y advertencias. */
  validarParaPublicar(): { errores: string[]; advertencias: string[] } {
    const errores: string[]      = [];
    const advertencias: string[] = [];
    const nodos       = this.estado.politica?.nodos      ?? [];
    const conexiones  = this.estado.politica?.conexiones ?? [];

    if (!nodos.some((n) => n.tipo === 'INICIO'))
      errores.push('Falta un nodo de INICIO en el diagrama.');

    if (!nodos.some((n) => n.tipo === 'FIN'))
      errores.push('Falta un nodo de FIN en el diagrama.');

    const nodosConexion = new Set<string>();
    conexiones.forEach((c) => {
      nodosConexion.add(c.nodoOrigenId);
      nodosConexion.add(c.nodoDestinoId);
    });
    nodos
      .filter((n) => !nodosConexion.has(n.id) && nodos.length > 1)
      .forEach((n) => errores.push(`El nodo "${n.etiqueta}" está aislado (sin conexiones).`));

    nodos
      .filter((n) => n.tipoFlujo === 'CONDICIONAL' && (n.condiciones?.length ?? 0) < 2)
      .forEach((n) =>
        advertencias.push(
          `El nodo "${n.etiqueta}" es CONDICIONAL pero tiene menos de 2 condiciones.`
        )
      );

    nodos
      .filter((n) => n.tipo === 'ACTIVIDAD' && !n.formulario)
      .forEach((n) =>
        advertencias.push(`El nodo "${n.etiqueta}" es una ACTIVIDAD sin formulario asignado.`)
      );

    return { errores, advertencias };
  }
}
