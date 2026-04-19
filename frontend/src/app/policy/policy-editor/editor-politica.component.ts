import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Graph, InternalEvent, Cell } from '@maxgraph/core';
import type { CellStyle } from '@maxgraph/core';
import {
  Politica,
  Carril,
  Nodo,
  TipoNodo,
  TipoFlujo,
  TipoCampo,
  CampoFormulario,
  Formulario,
} from '../../shared/models/policy.model';
import {
  PoliticaService,
  SolicitudActualizarDiagrama,
} from '../../shared/services/politica.service';
import { IaService, DiagramaIA, NodoIA, ConexionIA } from '../../shared/services/ia.service';
import { WebsocketService } from '../../shared/services/websocket.service';
import { AuthService } from '../../shared/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-editor-politica',
  templateUrl: './editor-politica.component.html',
  styleUrls: ['./editor-politica.component.scss'],
  standalone: false,
})
export class EditorPoliticaComponent implements OnInit, OnDestroy {
  @ViewChild('graphContainer', { static: false }) graphContainer!: ElementRef<HTMLDivElement>;

  politica: Politica | null = null;
  cargando = true;
  guardando = false;

  // Panel: agregar carril
  panelCarrilAbierto = false;
  /** Carril que se está editando (null = creando uno nuevo) */
  carrilEditando: Carril | null = null;
  formularioCarril!: FormGroup;

  // CU-07: publicar
  publicando = false;
  panelPublicarAbierto = false;
  erroresValidacion: string[] = [];
  advertenciasValidacion: string[] = [];
  validacionLimpia = false;

  // CU-08: panel IA
  panelIaAbierto = false;
  promptIA = '';
  generandoIA = false;
  resultadoIA: DiagramaIA | null = null;
  descripcionIA = '';

  // CU-09: voz
  grabandoVoz = false;
  private reconocimientoVoz: any = null;

  // CU-10: edición colaborativa
  usuariosPresentes: { correo: string; nombre: string }[] = [];
  private subColaborativo?: Subscription;
  private subPresencia?: Subscription;

  // Panel: propiedades del nodo (CU-05 y CU-06)
  nodoSeleccionado: Nodo | null = null;
  tabActiva = 0; // 0=Flujo, 1=Formulario
  formularioFlujo!: FormGroup;
  formularioFormulario!: FormGroup;
  formularioCampo!: FormGroup;

  private grafo!: Graph;
  private celdaPorNodoId = new Map<string, Cell>();
  private celdaPorCarrilId = new Map<string, Cell>();
  /** Guard para evitar recursión infinita al re-parentar nodos entre carriles */
  private reParentando = false;

  /** Indica si hay al menos una celda seleccionada (nodo o arista) */
  haySeleccion = false;

  /** Auto-guardado */
  autoGuardando = false;
  /** 'guardado' | 'pendiente' | null */
  estadoGuardado: 'guardado' | 'pendiente' | null = null;
  private estadoGuardadoTimer: ReturnType<typeof setTimeout> | null = null;
  private autoGuardadoTimer: ReturnType<typeof setTimeout> | null = null;
  /** Evita disparar auto-guardado mientras se carga el diagrama inicial */
  private diagramaCargado = false;

  // ── Teclado: Delete / Backspace / Ctrl+S ──────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    // Ctrl+S → guardar manualmente
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.guardarDiagrama();
      return;
    }
    // Delete / Backspace → eliminar selección (fuera de inputs)
    if ((e.key === 'Delete' || e.key === 'Backspace') &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)) {
      this.eliminarSeleccion();
    }
  }

  private programarAutoGuardado(): void {
    if (this.autoGuardadoTimer) clearTimeout(this.autoGuardadoTimer);
    this.estadoGuardado = 'pendiente';
    this.autoGuardadoTimer = setTimeout(() => this.guardarDiagrama(true), 2500);
  }

  readonly tiposNodo: { tipo: TipoNodo; etiqueta: string; icono: string }[] = [
    { tipo: 'INICIO', etiqueta: 'Inicio', icono: 'play_circle' },
    { tipo: 'ACTIVIDAD', etiqueta: 'Actividad', icono: 'task' },
    { tipo: 'DECISION', etiqueta: 'Decisión', icono: 'call_split' },
    { tipo: 'COMPUERTA_PARALELA', etiqueta: 'Paralela', icono: 'device_hub' },
    { tipo: 'COMPUERTA_UNION', etiqueta: 'Unión', icono: 'merge_type' },
    { tipo: 'FIN', etiqueta: 'Fin', icono: 'stop_circle' },
  ];

  readonly opcionesFlujo: { valor: TipoFlujo; etiqueta: string; descripcion: string }[] = [
    {
      valor: 'LINEAL',
      etiqueta: 'Lineal',
      descripcion: 'El flujo continúa directamente al siguiente nodo.',
    },
    {
      valor: 'CONDICIONAL',
      etiqueta: 'Condicional',
      descripcion: 'El flujo se bifurca; define condiciones para cada rama.',
    },
    {
      valor: 'ITERATIVO',
      etiqueta: 'Iterativo',
      descripcion: 'El flujo puede regresar hasta que se cumpla la condición de salida.',
    },
    {
      valor: 'PARALELO',
      etiqueta: 'Paralelo',
      descripcion: 'Dos o más nodos se activan simultáneamente.',
    },
  ];

  readonly tiposCampo: { valor: TipoCampo; etiqueta: string }[] = [
    { valor: 'TEXTO', etiqueta: 'Texto' },
    { valor: 'NUMERO', etiqueta: 'Número' },
    { valor: 'FECHA', etiqueta: 'Fecha' },
    { valor: 'BOOLEANO', etiqueta: 'Sí / No' },
    { valor: 'ARCHIVO', etiqueta: 'Archivo' },
    { valor: 'SELECCION', etiqueta: 'Selección' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private politicaService: PoliticaService,
    private iaService: IaService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private wsService: WebsocketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.formularioCarril = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      orientacion: ['columna'],
    });

    this.formularioFlujo = this.fb.group({
      tipoFlujo: ['LINEAL', Validators.required],
      nuevaCondicion: [''],
    });

    this.formularioFormulario = this.fb.group({
      titulo: ['', Validators.required],
      instrucciones: [''],
      nuevoRequisito: [''],
    });

    this.formularioCampo = this.fb.group({
      nombre: ['', Validators.required],
      etiqueta: ['', Validators.required],
      tipoCampo: ['TEXTO', Validators.required],
      requerido: [false],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/policy']);
      return;
    }

    this.iniciarColaboracion(id);
    this.politicaService.obtenerPolitica(id).subscribe({
      next: (p) => {
        this.politica = p;
        this.cargando = false;
        this.cdr.detectChanges();
        setTimeout(() => this.inicializarGrafo(), 0);
      },
      error: () => {
        this.cargando = false;
        this.snackBar.open('Error al cargar la política', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/policy']);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.autoGuardadoTimer) clearTimeout(this.autoGuardadoTimer);
    if (this.estadoGuardadoTimer) clearTimeout(this.estadoGuardadoTimer);
    if (this.grafo) {
      this.grafo.destroy();
    }
    this.detenerColaboracion();
  }

  // ── Grafo ──────────────────────────────────────────────────────────────

  private inicializarGrafo(): void {
    const container = this.graphContainer.nativeElement;
    InternalEvent.disableContextMenu(container);

    this.grafo = new Graph(container);
    this.grafo.setPanning(true);
    this.grafo.setTooltips(true);
    this.grafo.setConnectable(true);
    this.grafo.setEnabled(this.politica?.estado !== 'PUBLICADA');
    // Evitar que maxGraph auto-expanda los carriles cuando un nodo se arrastra fuera de sus bordes
    this.grafo.autoExtend = false;
    // Evitar que maxGraph estire el carril padre cuando se mueve un hijo fuera
    this.grafo.extendParentsOnMove = false;

    const edgeStyle = this.grafo.getStylesheet().getDefaultEdgeStyle();
    edgeStyle.rounded = true;

    // Actualizar haySeleccion cuando cambie la selección
    this.grafo.getSelectionModel().addListener(InternalEvent.CHANGE, () => {
      this.haySeleccion = this.grafo.getSelectionCount() > 0;
      this.cdr.detectChanges();
    });

    // Auto-guardado + re-parentar nodos al soltar entre carriles
    this.grafo.model.addListener(InternalEvent.CHANGE, () => {
      if (!this.diagramaCargado) return;
      if (this.politica?.estado === 'PUBLICADA') return;
      if (!this.reParentando) {
        requestAnimationFrame(() => this.sincronizarParentsDenodos());
      }
      this.programarAutoGuardado();
    });

    // Detectar selección de nodo
    this.grafo.addListener(InternalEvent.CLICK, (_sender: any, evt: any) => {
      const celda: Cell = evt.getProperty('cell');
      if (!celda || !celda.isVertex()) {
        this.nodoSeleccionado = null;
        return;
      }
      const nodo = this.politica?.nodos.find((n) => n.id === celda.getId());
      if (nodo) {
        this.abrirPropiedadesNodo(nodo);
      } else {
        this.nodoSeleccionado = null;
      }
    });

    if (this.politica && this.politica.carriles.length > 0) {
      this.cargarDiagramaExistente();
    } else {
      this.crearEstructuraInicial();
    }
    // Habilitar auto-guardado DESPUÉS de cargar para no guardarlo al inicializar
    this.diagramaCargado = true;
  }

  private crearEstructuraInicial(): void {
    const padre = this.grafo.getDefaultParent();
    this.grafo.batchUpdate(() => {
      const carrilId = this.generarId();
      // Default: columna (horizontal=true → label arriba, estándar en diagramas de actividad)
      const swimlane = this.grafo.insertVertex(
        padre,
        carrilId,
        'Área Principal',
        0,
        0,
        200,
        600,
        { shape: 'swimlane', horizontal: true, startSize: 30 }
      );
      this.celdaPorCarrilId.set(carrilId, swimlane);
      if (this.politica) {
        this.politica.carriles = [{ id: carrilId, nombre: 'Área Principal', orden: 0, horizontal: true }];
      }
    });
  }

  /**
   * Re-parentar nodos que hayan sido arrastrados fuera de los límites de su carril.
   * Se ejecuta vía requestAnimationFrame después de cada cambio en el modelo del grafo.
   * Esto asegura que el parent en maxGraph siempre coincida con el carril donde el nodo
   * visualmente está, y que las coordenadas sean relativas al nuevo parent.
   */
  private sincronizarParentsDenodos(): void {
    if (this.reParentando || !this.politica) return;

    const startSize = 30;
    const defaultParentId = this.grafo.getDefaultParent().getId();

    const cambios: Array<{
      celda: Cell;
      nuevoParent: Cell;
      nuevoCarrilId: string;
      newX: number;
      newY: number;
    }> = [];

    this.celdaPorNodoId.forEach((celda) => {
      if (!celda.geometry || !celda.parent) return;
      const parentId = celda.parent.getId();
      if (!parentId) return;

      const enSwimlane = this.celdaPorCarrilId.has(parentId);
      const enDefaultParent = parentId === defaultParentId;

      if (!enSwimlane && !enDefaultParent) return;

      let absX: number;
      let absY: number;

      if (enSwimlane) {
        // El nodo está dentro de un swimlane → coords relativas al área de contenido
        const parentGeo = celda.parent.geometry!;
        absX = parentGeo.x + celda.geometry.x;
        absY = parentGeo.y + startSize + celda.geometry.y;
      } else {
        // El nodo está en el parent raíz → maxGraph lo soltó con coords absolutas
        absX = celda.geometry.x;
        absY = celda.geometry.y;
      }

      const absCX = absX + celda.geometry.width / 2;
      const absCY = absY + celda.geometry.height / 2;

      // Buscar el carril al que pertenece visualmente
      for (const [carrilId, swimlane] of this.celdaPorCarrilId) {
        if (carrilId === parentId) continue; // ya está en el carril correcto
        const sg = swimlane.geometry;
        if (!sg) continue;

        if (
          absCX >= sg.x && absCX <= sg.x + sg.width &&
          absCY >= sg.y && absCY <= sg.y + sg.height
        ) {
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

    this.reParentando = true;
    this.grafo.batchUpdate(() => {
      cambios.forEach(({ celda, nuevoParent, nuevoCarrilId, newX, newY }) => {
        // 1. Cambiar parent en el modelo de maxGraph
        const idx = nuevoParent.getChildCount();
        this.grafo.model.add(nuevoParent, celda, idx);
        // 2. Fijar la geometría relativa al área de contenido del nuevo carril
        const newGeo = celda.geometry!.clone();
        newGeo.x = newX;
        newGeo.y = newY;
        this.grafo.model.setGeometry(celda, newGeo);
        // 3. Actualizar el modelo de datos local
        const nodoId = celda.getId();
        if (nodoId) {
          const nodo = this.politica!.nodos.find((n) => n.id === nodoId);
          if (nodo) nodo.carrilId = nuevoCarrilId;
        }
      });
    });
    this.reParentando = false;
  }

  private cargarDiagramaExistente(): void {
    if (!this.politica) return;
    const padre = this.grafo.getDefaultParent();

    this.grafo.batchUpdate(() => {
      this.politica!.carriles.forEach((carril, idx) => {
        const esColumna = carril.horizontal === true;
        // Usar posición guardada si existe; si no, calcular por índice (primera vez)
        const x     = carril.posX  ?? (esColumna ? idx * 200 : 0);
        const y     = carril.posY  ?? (esColumna ? 0 : idx * 200);
        const ancho = carril.ancho ?? (esColumna ? 200 : 800);
        const alto  = carril.alto  ?? (esColumna ? 600 : 200);
        const swimlane = this.grafo.insertVertex(
          padre,
          carril.id,
          carril.nombre,
          x,
          y,
          ancho,
          alto,
          { shape: 'swimlane', horizontal: esColumna, startSize: 30 }
        );
        this.celdaPorCarrilId.set(carril.id, swimlane);
      });

      this.politica!.nodos.forEach((nodo) => {
        const celda = this.celdaPorCarrilId.get(nodo.carrilId) ?? padre;
        const vertex = this.grafo.insertVertex(
          celda,
          nodo.id,
          nodo.etiqueta,
          nodo.posX,
          nodo.posY,
          nodo.ancho,
          nodo.alto,
          this.estiloParaTipo(nodo.tipo)
        );
        this.celdaPorNodoId.set(nodo.id, vertex);
      });

      this.politica!.conexiones.forEach((conexion) => {
        const origen = this.celdaPorNodoId.get(conexion.nodoOrigenId);
        const destino = this.celdaPorNodoId.get(conexion.nodoDestinoId);
        if (origen && destino) {
          this.grafo.insertEdge(
            padre,
            conexion.id,
            conexion.etiqueta ?? '',
            origen,
            destino
          );
        }
      });
    });
  }

  // ── CU-04: nodos y carriles ────────────────────────────────────────────

  agregarNodo(tipo: TipoNodo, etiqueta: string): void {
    if (!this.politica || this.politica.carriles.length === 0) {
      this.snackBar.open('Añade al menos un carril primero', 'Cerrar', { duration: 2500 });
      return;
    }

    const primerCarril = this.politica.carriles[0];
    const celdaCarril = this.celdaPorCarrilId.get(primerCarril.id);
    if (!celdaCarril) return;

    const nodoId = this.generarId();
    const { ancho, alto } = this.dimensionesParaTipo(tipo);
    const posX = 50 + Math.random() * 200;
    const posY = 50 + Math.random() * 80;

    this.grafo.batchUpdate(() => {
      const vertex = this.grafo.insertVertex(
        celdaCarril,
        nodoId,
        etiqueta,
        posX,
        posY,
        ancho,
        alto,
        this.estiloParaTipo(tipo)
      );
      this.celdaPorNodoId.set(nodoId, vertex);
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
    this.politica.nodos.push(nuevoNodo);
  }

  agregarCarril(): void {
    if (this.formularioCarril.invalid || !this.politica) return;
    const nombre: string = this.formularioCarril.value.nombre;
    const esColumna: boolean = this.formularioCarril.value.orientacion === 'columna';

    // ── MODO EDICIÓN: actualizar carril existente ──────────────────────
    if (this.carrilEditando) {
      const carril = this.carrilEditando;
      carril.nombre = nombre;
      const orientacionCambio = carril.horizontal !== esColumna;
      carril.horizontal = esColumna;

      const celdaCarril = this.celdaPorCarrilId.get(carril.id);
      if (celdaCarril) {
        this.grafo.batchUpdate(() => {
          // Actualizar etiqueta
          this.grafo.model.setValue(celdaCarril, nombre);
          // Si cambió la orientación, redimensionar y aplicar nuevo estilo
          if (orientacionCambio) {
            const geo = celdaCarril.geometry!.clone();
            // Intercambiar ancho/alto y recalcular si son los valores por defecto
            const defAncho = esColumna ? 200 : 800;
            const defAlto  = esColumna ? 600 : 200;
            geo.width  = defAncho;
            geo.height = defAlto;
            this.grafo.model.setGeometry(celdaCarril, geo);
            this.grafo.model.setStyle(celdaCarril, {
              shape: 'swimlane',
              horizontal: esColumna,
              startSize: 30,
            });
          }
        });
      }

      this.carrilEditando = null;
      this.formularioCarril.reset({ orientacion: 'columna' });
      this.panelCarrilAbierto = false;
      this.programarAutoGuardado();
      return;
    }

    // ── MODO CREACIÓN ──────────────────────────────────────────────────
    const orden = this.politica.carriles.length;
    const carrilId = this.generarId();
    const padre = this.grafo.getDefaultParent();

    const x     = esColumna ? orden * 200 : 0;
    const y     = esColumna ? 0 : orden * 200;
    const ancho = esColumna ? 200 : 800;
    const alto  = esColumna ? 600 : 200;

    this.grafo.batchUpdate(() => {
      const swimlane = this.grafo.insertVertex(
        padre,
        carrilId,
        nombre,
        x,
        y,
        ancho,
        alto,
        { shape: 'swimlane', horizontal: esColumna, startSize: 30 }
      );
      this.celdaPorCarrilId.set(carrilId, swimlane);
    });

    this.politica.carriles.push({ id: carrilId, nombre, orden, horizontal: esColumna });
    this.formularioCarril.reset({ orientacion: 'columna' });
    this.panelCarrilAbierto = false;
  }

  /** Abre el dialog de carril en modo edición */
  editarCarril(carril: Carril): void {
    if (this.politica?.estado === 'PUBLICADA') return;
    this.carrilEditando = carril;
    this.formularioCarril.setValue({
      nombre: carril.nombre,
      orientacion: carril.horizontal === true ? 'columna' : 'fila',
    });
    this.panelCarrilAbierto = true;
  }

  // ── CU-04: eliminar elementos seleccionados ───────────────────────────

  eliminarSeleccion(): void {
    if (!this.grafo || this.politica?.estado === 'PUBLICADA') return;
    const celdas = this.grafo.getSelectionCells();
    if (!celdas || celdas.length === 0) return;

    // Recopilar qué limpiar ANTES de tocar el grafo
    const idsCarrilesAEliminar: string[] = [];
    const idsNodosAEliminar: string[] = [];

    celdas.forEach((celda) => {
      const id = celda.getId();
      if (!id || !celda.isVertex()) return;

      if (this.celdaPorCarrilId.has(id)) {
        idsCarrilesAEliminar.push(id);
        // Nodos hijos del carril también
        (this.politica?.nodos ?? [])
          .filter((n) => n.carrilId === id)
          .forEach((n) => idsNodosAEliminar.push(n.id));
      } else {
        idsNodosAEliminar.push(id);
      }
    });

    // 1. Eliminar físicamente del grafo
    this.grafo.batchUpdate(() => {
      this.grafo.removeCells(celdas);
    });

    // 2. Limpiar los Maps y el modelo local DESPUÉS del batchUpdate
    idsCarrilesAEliminar.forEach((id) => this.celdaPorCarrilId.delete(id));
    idsNodosAEliminar.forEach((id) => this.celdaPorNodoId.delete(id));

    if (this.politica) {
      const setCarriles = new Set(idsCarrilesAEliminar);
      const setNodos = new Set(idsNodosAEliminar);
      this.politica.carriles = this.politica.carriles.filter((c) => !setCarriles.has(c.id));
      this.politica.nodos = this.politica.nodos.filter((n) => !setNodos.has(n.id));
    }

    // Si el nodo seleccionado fue eliminado, cerrar el panel de propiedades
    if (this.nodoSeleccionado &&
        !this.celdaPorNodoId.has(this.nodoSeleccionado.id)) {
      this.nodoSeleccionado = null;
    }

    const hayCarrilesEliminados = idsCarrilesAEliminar.length > 0;
    this.haySeleccion = false;

    // 3. Forzar re-render de Angular (maxGraph corre fuera de la zona)
    this.cdr.detectChanges();

    // 4. Persistir inmediatamente
    if (hayCarrilesEliminados) {
      // Carril eliminado: guardar de forma NO silenciosa para que la respuesta
      // del backend reemplace this.politica completo (evita carriles fantasma en la paleta
      // y elimina condición de carrera con auto-guardados en vuelo).
      if (this.autoGuardadoTimer) { clearTimeout(this.autoGuardadoTimer); this.autoGuardadoTimer = null; }
      this.guardarDiagrama(false);
    } else {
      this.programarAutoGuardado();
    }

    this.snackBar.open('Elemento(s) eliminado(s).', 'Cerrar', { duration: 2000 });
  }

  // ── CU-05: Tipo de flujo ───────────────────────────────────────────────

  private abrirPropiedadesNodo(nodo: Nodo): void {
    this.nodoSeleccionado = nodo;

    this.formularioFlujo.patchValue({
      tipoFlujo: nodo.tipoFlujo ?? 'LINEAL',
      nuevaCondicion: '',
    });

    const f = nodo.formulario;
    this.formularioFormulario.patchValue({
      titulo: f?.titulo ?? '',
      instrucciones: f?.instrucciones ?? '',
      nuevoRequisito: '',
    });

    this.formularioCampo.reset({ tipoCampo: 'TEXTO', requerido: false });
  }

  cerrarPropiedades(): void {
    this.nodoSeleccionado = null;
  }

  guardarTipoFlujo(): void {
    if (!this.nodoSeleccionado || this.formularioFlujo.invalid) return;
    const tipoFlujo = this.formularioFlujo.value.tipoFlujo;

    // Validar: CONDICIONAL requiere al menos 2 condiciones
    if (tipoFlujo === 'CONDICIONAL') {
      const condiciones = this.nodoSeleccionado.condiciones ?? [];
      if (condiciones.length < 2) {
        this.snackBar.open(
          'Un nodo CONDICIONAL requiere al menos 2 condiciones de ramificación.',
          'Cerrar',
          { duration: 3500 }
        );
        return;
      }
    }

    this.nodoSeleccionado.tipoFlujo = tipoFlujo;
    // Auto-guardar tras aplicar el tipo de flujo
    this.programarAutoGuardado();
    this.snackBar.open('Tipo de flujo aplicado y guardando...', 'Cerrar', { duration: 2000 });
  }

  agregarCondicion(): void {
    if (!this.nodoSeleccionado) return;
    const valor: string = (this.formularioFlujo.value.nuevaCondicion ?? '').trim();
    if (!valor) return;
    if (!this.nodoSeleccionado.condiciones) {
      this.nodoSeleccionado.condiciones = [];
    }
    this.nodoSeleccionado.condiciones.push(valor);
    this.formularioFlujo.patchValue({ nuevaCondicion: '' });
  }

  eliminarCondicion(indice: number): void {
    this.nodoSeleccionado?.condiciones?.splice(indice, 1);
  }

  // ── CU-06: Formulario del nodo ─────────────────────────────────────────

  get requisitosNodo(): string[] {
    return this.nodoSeleccionado?.formulario?.requisitos ?? [];
  }

  get camposNodo(): CampoFormulario[] {
    return this.nodoSeleccionado?.formulario?.campos ?? [];
  }

  guardarEncabezadoFormulario(): void {
    if (!this.nodoSeleccionado || this.formularioFormulario.invalid) return;
    if (!this.nodoSeleccionado.formulario) {
      this.nodoSeleccionado.formulario = {
        titulo: '',
        instrucciones: '',
        requisitos: [],
        campos: [],
      };
    }
    this.nodoSeleccionado.formulario.titulo = this.formularioFormulario.value.titulo;
    this.nodoSeleccionado.formulario.instrucciones =
      this.formularioFormulario.value.instrucciones ?? '';
    this.snackBar.open('Encabezado guardado. Recuerda guardar el diagrama.', 'Cerrar', {
      duration: 2500,
    });
  }

  agregarRequisito(): void {
    if (!this.nodoSeleccionado) return;
    const valor: string = (this.formularioFormulario.value.nuevoRequisito ?? '').trim();
    if (!valor) return;
    this.asegurarFormulario();
    this.nodoSeleccionado.formulario!.requisitos.push(valor);
    this.formularioFormulario.patchValue({ nuevoRequisito: '' });
  }

  eliminarRequisito(indice: number): void {
    this.nodoSeleccionado?.formulario?.requisitos.splice(indice, 1);
  }

  agregarCampo(): void {
    if (!this.nodoSeleccionado || this.formularioCampo.invalid) return;
    this.asegurarFormulario();
    const campo: CampoFormulario = {
      nombre: this.formularioCampo.value.nombre,
      etiqueta: this.formularioCampo.value.etiqueta,
      tipoCampo: this.formularioCampo.value.tipoCampo,
      requerido: this.formularioCampo.value.requerido ?? false,
    };
    this.nodoSeleccionado.formulario!.campos.push(campo);
    this.formularioCampo.reset({ tipoCampo: 'TEXTO', requerido: false });
  }

  eliminarCampo(indice: number): void {
    this.nodoSeleccionado?.formulario?.campos.splice(indice, 1);
  }

  private asegurarFormulario(): void {
    if (!this.nodoSeleccionado!.formulario) {
      this.nodoSeleccionado!.formulario = {
        titulo: this.formularioFormulario.value.titulo ?? '',
        instrucciones: this.formularioFormulario.value.instrucciones ?? '',
        requisitos: [],
        campos: [],
      };
    }
  }

  // ── Guardar todo ───────────────────────────────────────────────────────

  guardarDiagrama(silencioso = false): void {
    if (!this.politica) return;
    // Cancelar auto-guardado pendiente si se está guardando manualmente
    if (this.autoGuardadoTimer) { clearTimeout(this.autoGuardadoTimer); this.autoGuardadoTimer = null; }
    if (silencioso) {
      this.autoGuardando = true;
    } else {
      this.guardando = true;
    }

    // 1. Sincronizar posiciones y tamaños de CARRILES
    this.politica.carriles.forEach((carril) => {
      const celdaCarril = this.celdaPorCarrilId.get(carril.id);
      if (celdaCarril?.geometry) {
        carril.posX  = celdaCarril.geometry.x;
        carril.posY  = celdaCarril.geometry.y;
        carril.ancho = celdaCarril.geometry.width;
        carril.alto  = celdaCarril.geometry.height;
      }
    });

    // 1b. Eliminar carriles que ya no existen en los Maps (defensa ante borrado)
    this.politica.carriles = this.politica.carriles.filter(
      (c) => this.celdaPorCarrilId.has(c.id)
    );

    // 2. Sincronizar posiciones de nodos y carrilId (el parent ya fue actualizado en tiempo real por sincronizarParentsDenodos)
    this.politica.nodos.forEach((nodo) => {
      const celda = this.celdaPorNodoId.get(nodo.id);
      if (!celda?.geometry) return;
      nodo.posX  = celda.geometry.x;
      nodo.posY  = celda.geometry.y;
      nodo.ancho = celda.geometry.width;
      nodo.alto  = celda.geometry.height;
      // Leer el carrilId del parent real en el modelo (ya sincronizado por sincronizarParentsDenodos)
      const parentId = celda.parent?.getId();
      if (parentId && this.celdaPorCarrilId.has(parentId)) {
        nodo.carrilId = parentId;
      }
    });

    // 3. Eliminar nodos que hayan sido borrados del grafo (Delete/Backspace)
    this.politica.nodos = this.politica.nodos.filter(
      (nodo) => this.celdaPorNodoId.has(nodo.id)
    );

    // 4. Recopilar TODAS las aristas recursivamente (incluye las dentro de swimlanes)
    const recopilarAristas = (celda: Cell): Cell[] => {
      const aristas: Cell[] = [];
      (celda.children ?? []).forEach((hijo) => {
        if (hijo.isEdge() && hijo.source && hijo.target) {
          aristas.push(hijo);
        }
        aristas.push(...recopilarAristas(hijo));
      });
      return aristas;
    };
    const padre = this.grafo.getDefaultParent();
    const todasLasAristas = recopilarAristas(padre);
    this.politica.conexiones = todasLasAristas.map((c) => {
      const existente = this.politica!.conexiones.find((cx) => cx.id === c.getId());
      return {
        id: c.getId() ?? this.generarId(),
        nodoOrigenId: c.source!.getId()!,
        nodoDestinoId: c.target!.getId()!,
        etiqueta: existente?.etiqueta ?? (typeof c.value === 'string' ? c.value : ''),
        condicion: existente?.condicion,
      };
    });

    const solicitud: SolicitudActualizarDiagrama = {
      carriles: this.politica.carriles,
      nodos: this.politica.nodos,
      conexiones: this.politica.conexiones,
    };


    this.politicaService.actualizarDiagrama(this.politica.id, solicitud).subscribe({
      next: (p) => {
        if (silencioso) {
          // Auto-guardado silencioso: NO sobreescribir el estado local con la respuesta
          // del servidor para evitar condición de carrera (el estado local es fuente de verdad).
          // Solo sincronizar campos que controla exclusivamente el backend.
          if (this.politica) {
            this.politica.estado = p.estado;
          }
        } else {
          // Guardado manual (Ctrl+S): sí sincronizamos completamente con el backend
          this.politica = p;
        }
        // DEBUG TEMPORAL: ver qué devuelve el backend
        console.log('[guardarDiagrama] respuesta del backend:',
          JSON.stringify({ carriles: p.carriles?.map((c: any) => c.nombre) })
        );
        this.guardando = false;
        this.autoGuardando = false;
        this.estadoGuardado = 'guardado';
        // Ocultar el badge "Guardado" después de 3 segundos
        if (this.estadoGuardadoTimer) clearTimeout(this.estadoGuardadoTimer);
        this.estadoGuardadoTimer = setTimeout(() => {
          this.estadoGuardado = null;
          this.cdr.detectChanges();
        }, 3000);
        if (!silencioso) {
          this.snackBar.open('Diagrama guardado', 'Cerrar', { duration: 2000 });
        }
        this.publicarCambioColaborativo();
      },
      error: () => {
        this.guardando = false;
        this.autoGuardando = false;
        this.estadoGuardado = null;
        if (!silencioso) {
          this.snackBar.open('Error al guardar el diagrama', 'Cerrar', { duration: 3000 });
        }
      },
    });
  }

  // ── CU-07: Validar y publicar política ─────────────────────────────────

  private validarDiagramaParaPublicar(): { errores: string[]; advertencias: string[] } {
    const errores: string[] = [];
    const advertencias: string[] = [];
    const nodos = this.politica?.nodos ?? [];
    const conexiones = this.politica?.conexiones ?? [];

    // Error: falta nodo INICIO
    const tieneInicio = nodos.some((n) => n.tipo === 'INICIO');
    if (!tieneInicio) errores.push('Falta un nodo de INICIO en el diagrama.');

    // Error: falta nodo FIN
    const tieneFin = nodos.some((n) => n.tipo === 'FIN');
    if (!tieneFin) errores.push('Falta un nodo de FIN en el diagrama.');

    // Error: nodos aislados (sin ninguna conexión)
    const nodosConexion = new Set<string>();
    conexiones.forEach((c) => {
      nodosConexion.add(c.nodoOrigenId);
      nodosConexion.add(c.nodoDestinoId);
    });
    const aislados = nodos.filter(
      (n) => !nodosConexion.has(n.id) && nodos.length > 1
    );
    if (aislados.length > 0) {
      aislados.forEach((n) =>
        errores.push(`El nodo "${n.etiqueta}" está aislado (sin conexiones).`)
      );
    }

    // Advertencia: nodos DECISION sin condiciones definidas
    nodos
      .filter((n) => n.tipoFlujo === 'CONDICIONAL' && (n.condiciones?.length ?? 0) < 2)
      .forEach((n) =>
        advertencias.push(
          `El nodo "${n.etiqueta}" es CONDICIONAL pero tiene menos de 2 condiciones.`
        )
      );

    // Advertencia: nodos ACTIVIDAD sin formulario
    nodos
      .filter((n) => n.tipo === 'ACTIVIDAD' && !n.formulario)
      .forEach((n) =>
        advertencias.push(`El nodo "${n.etiqueta}" es una ACTIVIDAD sin formulario asignado.`)
      );

    return { errores, advertencias };
  }

  abrirDialogoPublicar(): void {
    if (!this.politica || this.politica.estado === 'PUBLICADA') return;
    const { errores, advertencias } = this.validarDiagramaParaPublicar();
    this.erroresValidacion = errores;
    this.advertenciasValidacion = advertencias;
    this.validacionLimpia = errores.length === 0;
    this.panelPublicarAbierto = true;
  }

  publicarPolitica(): void {
    if (!this.politica) return;
    this.publicando = true;
    this.panelPublicarAbierto = false;
    this.politicaService.publicarPolitica(this.politica.id).subscribe({
      next: (p) => {
        this.politica = p;
        this.publicando = false;
        this.snackBar.open('¡Política publicada exitosamente!', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.publicando = false;
        const msg = err?.error?.mensaje ?? 'Error al publicar la política';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  // ── CU-08: Generar diagrama con IA ────────────────────────────────────

  generarDiagramaConIA(): void {
    if (!this.promptIA.trim()) return;
    this.generandoIA = true;
    this.resultadoIA = null;
    this.descripcionIA = '';
    this.iaService.generarDiagrama(this.promptIA).subscribe({
      next: (resp) => {
        this.resultadoIA = resp.diagrama;
        this.descripcionIA = resp.descripcion;
        this.generandoIA = false;
        this.aplicarDiagramaIA(resp.diagrama);
        this.snackBar.open('Diagrama generado por IA', 'Cerrar', { duration: 3000 });
      },
      error: () => {
        this.generandoIA = false;
        this.snackBar.open('Error al conectar con el servicio IA', 'Cerrar', { duration: 4000 });
      },
    });
  }

  private aplicarDiagramaIA(diagrama: DiagramaIA): void {
    if (!this.politica || !this.grafo) return;

    // Limpiar el diagrama local
    this.politica.carriles = [];
    this.politica.nodos = [];
    this.politica.conexiones = [];
    this.celdaPorNodoId.clear();

    // Reconstruir carriles
    diagrama.carriles.forEach((c) => {
      this.politica!.carriles.push({ id: c.id, nombre: c.nombre, orden: c.orden });
    });

    // Reconstruir nodos
    diagrama.nodos.forEach((n: NodoIA) => {
      const nodo: Nodo = {
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
      };
      this.politica!.nodos.push(nodo);
    });

    // Reconstruir conexiones
    diagrama.conexiones.forEach((cx: ConexionIA) => {
      this.politica!.conexiones.push({ id: cx.id, nodoOrigenId: cx.nodoOrigenId, nodoDestinoId: cx.nodoDestinoId, etiqueta: cx.etiqueta ?? '' });
    });

    // Re-renderizar el grafo (destruir el anterior primero)
    this.grafo?.destroy();
    this.celdaPorNodoId.clear();
    this.celdaPorCarrilId.clear();
    this.inicializarGrafo();
    this.panelIaAbierto = false;
  }

  volverALista(): void {
    this.router.navigate(['/policy']);
  }

  // ── CU-10: Colaboración en tiempo real ─────────────────────────────────

  private iniciarColaboracion(politicaId: string): void {
    const usuario = this.authService.obtenerUsuarioActual();
    if (!usuario) return;

    this.wsService.conectar();

    this.subColaborativo = this.wsService
      .suscribir<any>(`/topic/politicas/${politicaId}`)
      .subscribe((mensaje) => {
        if (mensaje.autorCorreo === usuario.correo) return; // ignorar propios
        if (mensaje.payload) {
          this.aplicarCambioRemoto(mensaje.payload);
        }
      });

    this.subPresencia = this.wsService
      .suscribir<any>(`/topic/politicas/${politicaId}/presencia`)
      .subscribe((msg) => {
        if (msg.tipo === 'ENTRO') {
          if (!this.usuariosPresentes.find(u => u.correo === msg.correo)) {
            this.usuariosPresentes = [...this.usuariosPresentes, { correo: msg.correo, nombre: msg.nombre }];
          }
        } else {
          this.usuariosPresentes = this.usuariosPresentes.filter(u => u.correo !== msg.correo);
        }
      });

    // Anunciar presencia propia
    this.wsService.publicar(`/app/politicas/${politicaId}/presencia`, {
      tipo: 'ENTRO',
      politicaId,
      correo: usuario.correo,
      nombre: usuario.nombre,
    });
  }

  private detenerColaboracion(): void {
    const politicaId = this.politica?.id;
    const usuario = this.authService.obtenerUsuarioActual();
    if (politicaId && usuario) {
      this.wsService.publicar(`/app/politicas/${politicaId}/presencia`, {
        tipo: 'SALIO',
        politicaId,
        correo: usuario.correo,
        nombre: usuario.nombre,
      });
    }
    this.subColaborativo?.unsubscribe();
    this.subPresencia?.unsubscribe();
    this.wsService.desconectar();
  }

  private aplicarCambioRemoto(payload: any): void {
    if (!this.politica) return;
    // El payload es SolicitudActualizarDiagrama con carriles/nodos/conexiones
    if (payload.carriles) this.politica.carriles = payload.carriles;
    if (payload.nodos) this.politica.nodos = payload.nodos;
    if (payload.conexiones) this.politica.conexiones = payload.conexiones;
    // Destruir el grafo anterior antes de re-renderizar
    this.grafo?.destroy();
    this.celdaPorNodoId.clear();
    this.celdaPorCarrilId.clear();
    this.inicializarGrafo();
    this.snackBar.open('Diagrama actualizado por otro usuario', 'Cerrar', { duration: 2500 });
  }

  private publicarCambioColaborativo(): void {
    const politicaId = this.politica?.id;
    const usuario = this.authService.obtenerUsuarioActual();
    if (!politicaId || !usuario) return;

    const payload: SolicitudActualizarDiagrama = {
      carriles: this.politica!.carriles,
      nodos: this.politica!.nodos,
      conexiones: this.politica!.conexiones,
    };

    this.wsService.publicar(`/app/politicas/${politicaId}/colaborar`, {
      tipo: 'CAMBIO',
      politicaId,
      autorCorreo: usuario.correo,
      autorNombre: usuario.nombre,
      payload,
    });
  }

  // ── CU-09: Voz ─────────────────────────────────────────────────────────────

  get soportaVoz(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  iniciarGrabacionVoz(): void {
    if (!this.soportaVoz) {
      this.snackBar.open('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.', 'Cerrar', { duration: 4000 });
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.reconocimientoVoz = new SpeechRecognition();
    this.reconocimientoVoz.lang = 'es-ES';
    this.reconocimientoVoz.continuous = false;
    this.reconocimientoVoz.interimResults = false;

    this.reconocimientoVoz.onstart = () => { this.grabandoVoz = true; };
    this.reconocimientoVoz.onend = () => { this.grabandoVoz = false; };
    this.reconocimientoVoz.onerror = (evt: any) => {
      this.grabandoVoz = false;
      this.snackBar.open(`Error de voz: ${evt.error}`, 'Cerrar', { duration: 4000 });
    };
    this.reconocimientoVoz.onresult = (evt: any) => {
      const transcripcion: string = evt.results[0][0].transcript;
      this.promptIA = transcripcion;
      this.snackBar.open(`Transcripción: "${transcripcion}"`, 'Cerrar', { duration: 3000 });
    };

    this.reconocimientoVoz.start();
  }

  detenerGrabacionVoz(): void {
    if (this.reconocimientoVoz) {
      this.reconocimientoVoz.stop();
    }
  }

  // ── Utilidades ─────────────────────────────────────────────────────────

  private estiloParaTipo(tipo: TipoNodo): CellStyle {
    const estilos: Record<TipoNodo, CellStyle> = {
      INICIO: { shape: 'ellipse', fillColor: '#d5e8d4', strokeColor: '#82b366' },
      FIN: { shape: 'ellipse', fillColor: '#f8cecc', strokeColor: '#b85450' },
      ACTIVIDAD: { rounded: true, fillColor: '#dae8fc', strokeColor: '#6c8ebf' },
      DECISION: { shape: 'rhombus', fillColor: '#fff2cc', strokeColor: '#d6b656' },
      COMPUERTA_PARALELA: { shape: 'ellipse', fillColor: '#e1d5e7', strokeColor: '#9673a6' },
      COMPUERTA_UNION: { shape: 'ellipse', fillColor: '#f0a30a', strokeColor: '#BD7000' },
    };
    return estilos[tipo] ?? {};
  }

  private dimensionesParaTipo(tipo: TipoNodo): { ancho: number; alto: number } {
    if (tipo === 'INICIO' || tipo === 'FIN') return { ancho: 40, alto: 40 };
    if (tipo === 'DECISION') return { ancho: 80, alto: 60 };
    return { ancho: 120, alto: 50 };
  }

  private generarId(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}
