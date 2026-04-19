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
import { PoliticaService, SolicitudActualizarDiagrama } from '../../shared/services/politica.service';
import { IaService, DiagramaIA, NodoIA, ConexionIA } from '../../shared/services/ia.service';
import { WebsocketService } from '../../shared/services/websocket.service';
import { AuthService } from '../../shared/services/auth.service';
import { Subscription } from 'rxjs';
import { CellHighlight } from '@maxgraph/core';
import { GrafoEstadoService } from './grafo-estado.service';
import { GrafoRenderService } from './grafo-render.service';
import { GrafoCarrilesService } from './grafo-carriles.service';
import { GrafoGuardarService } from './grafo-guardar.service';

@Component({
  selector: 'app-editor-politica',
  templateUrl: './editor-politica.component.html',
  styleUrls: ['./editor-politica.component.scss'],
  standalone: false,
  providers: [GrafoEstadoService, GrafoRenderService, GrafoCarrilesService, GrafoGuardarService],
})
export class EditorPoliticaComponent implements OnInit, OnDestroy {
  @ViewChild('graphContainer', { static: false }) graphContainer!: ElementRef<HTMLDivElement>;

  // ── Estado del componente (UI) ─────────────────────────────────────────
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
  // Highlights de selección remota: correo → highlight + badge DOM
  private hl = new Map<string, CellHighlight>();
  private badges = new Map<string, HTMLElement>();
  private coloresRemoto = new Map<string, string>();

  // Panel: propiedades del nodo (CU-05 y CU-06)
  nodoSeleccionado: Nodo | null = null;
  tabActiva = 0; // 0=Flujo, 1=Formulario
  formularioFlujo!: FormGroup;
  formularioFormulario!: FormGroup;
  formularioCampo!: FormGroup;

  /** Indica si hay al menos una celda seleccionada (nodo o arista) */
  haySeleccion = false;

  /** Auto-guardado */
  autoGuardando = false;
  /** 'guardado' | 'pendiente' | null */
  estadoGuardado: 'guardado' | 'pendiente' | null = null;
  private estadoGuardadoTimer: ReturnType<typeof setTimeout> | null = null;
  private autoGuardadoTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Teclado: Delete / Backspace / Ctrl+S ──────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const enInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

    // Ctrl+S → guardar manualmente
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.guardarDiagrama();
      return;
    }

    // Ctrl+Z → deshacer (solo fuera de inputs de texto)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z' && !enInput) {
      e.preventDefault();
      if (this.grafoEstado.undoManager?.canUndo()) {
        this.grafoEstado.undoManager.undo();
        this.programarAutoGuardado();
      }
      return;
    }

    // Ctrl+Y → rehacer (solo fuera de inputs de texto)
    if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !enInput) {
      e.preventDefault();
      if (this.grafoEstado.undoManager?.canRedo()) {
        this.grafoEstado.undoManager.redo();
        this.programarAutoGuardado();
      }
      return;
    }

    // Ctrl+C → copiar selección del grafo (solo fuera de inputs de texto)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !enInput) {
      this.grafoCarriles.copiarSeleccion();
      return;
    }

    // Ctrl+V → pegar selección copiada (solo fuera de inputs de texto)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !enInput) {
      e.preventDefault();
      this.grafoCarriles.pegarSeleccion();
      this.programarAutoGuardado();
      return;
    }

    // Delete / Backspace → eliminar selección (fuera de inputs)
    if ((e.key === 'Delete' || e.key === 'Backspace') && !enInput) {
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
    private authService: AuthService,
    private grafoEstado: GrafoEstadoService,
    private grafoRender: GrafoRenderService,
    private grafoCarriles: GrafoCarrilesService,
    private grafoGuardar: GrafoGuardarService,
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
        this.grafoEstado.politica = p;
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
    this.limpiarTodosHighlights();
    this.grafoRender.destruir();
    this.detenerColaboracion();
  }

  // ── Grafo ──────────────────────────────────────────────────────────────

  private inicializarGrafo(): void {
    const container = this.graphContainer.nativeElement;
    this.grafoRender.registrarCallbacks(
      () => this.programarAutoGuardado(),
      (celdaId) => {
        // Broadcast selección local para otros colaboradores
        const politicaId = this.politica?.id;
        const usuario = this.authService.obtenerUsuarioActual();
        if (politicaId && usuario) {
          if (celdaId) {
            this.wsService.publicar(`/app/politicas/${politicaId}/colaborar`, {
              tipo: 'SELECCION_NODO',
              politicaId,
              autorCorreo: usuario.correo,
              autorNombre: usuario.nombre,
              payload: { nodoId: celdaId },
            });
          } else {
            this.wsService.publicar(`/app/politicas/${politicaId}/colaborar`, {
              tipo: 'DESELECCION_NODO',
              politicaId,
              autorCorreo: usuario.correo,
              autorNombre: usuario.nombre,
              payload: null,
            });
          }
        }
        if (!celdaId) { this.nodoSeleccionado = null; return; }
        const nodo = this.politica?.nodos.find((n) => n.id === celdaId);
        if (nodo) this.abrirPropiedadesNodo(nodo);
        else this.nodoSeleccionado = null; // fue un carril, no hay panel de propiedades
      },
      (haySel) => {
        this.haySeleccion = haySel;
        this.cdr.detectChanges();
      },
    );
    this.grafoRender.inicializar(container);
    // Sincronizar politica local con el estado del servicio (puede haber creado carriles)
    if (this.politica) {
      this.politica.carriles = this.grafoEstado.politica?.carriles ?? this.politica.carriles;
    }
    // Redibujar badges de otros usuarios cuando se hace pan/zoom
    const grafo = this.grafoEstado.grafo;
    if (grafo) {
      const redraw = () => this.actualizarPosicionesBadges();
      grafo.getView().addListener('scale', redraw);
      grafo.getView().addListener('translate', redraw);
      grafo.getView().addListener('scaleAndTranslate', redraw);
    }
  }

  // ── CU-04: nodos y carriles ────────────────────────────────────────────

  agregarNodo(tipo: TipoNodo, etiqueta: string): void {
    this.grafoCarriles.agregarNodo(tipo, etiqueta);
    // Sincronizar referencia local de nodos
    this.politica = this.grafoEstado.politica;
  }

  agregarCarril(): void {
    this.carrilEditando = this.grafoCarriles.agregarCarril(this.formularioCarril, this.carrilEditando);
    this.formularioCarril.reset({ orientacion: 'columna' });
    this.panelCarrilAbierto = false;
    if (!this.carrilEditando) this.programarAutoGuardado();
  }

  /** Abre el panel de carril en modo edición */
  editarCarril(carril: Carril): void {
    if (this.politica?.estado === 'PUBLICADA') return;
    this.carrilEditando = carril;
    this.grafoCarriles.editarCarril(carril, this.formularioCarril);
    this.panelCarrilAbierto = true;
  }

  // ── CU-04: eliminar elementos seleccionados ───────────────────────────

  eliminarSeleccion(): void {
    const nodoAnteriorId = this.nodoSeleccionado?.id ?? null;
    const resultId = this.grafoCarriles.eliminarSeleccion(
      nodoAnteriorId,
      () => { this.haySeleccion = false; this.cdr.detectChanges(); },
      () => { if (this.autoGuardadoTimer) { clearTimeout(this.autoGuardadoTimer); this.autoGuardadoTimer = null; } this.guardarDiagrama(false); },
      () => this.programarAutoGuardado(),
    );
    if (resultId !== nodoAnteriorId) this.nodoSeleccionado = null;
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
    this.programarAutoGuardado();
    this.snackBar.open('Encabezado guardado.', 'Cerrar', { duration: 2000 });
  }

  agregarRequisito(): void {
    if (!this.nodoSeleccionado) return;
    const valor: string = (this.formularioFormulario.value.nuevoRequisito ?? '').trim();
    if (!valor) return;
    this.asegurarFormulario();
    this.nodoSeleccionado.formulario!.requisitos.push(valor);
    this.formularioFormulario.patchValue({ nuevoRequisito: '' });
    this.programarAutoGuardado();
  }

  eliminarRequisito(indice: number): void {
    this.nodoSeleccionado?.formulario?.requisitos.splice(indice, 1);
    this.programarAutoGuardado();
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
    this.programarAutoGuardado();
  }

  eliminarCampo(indice: number): void {
    this.nodoSeleccionado?.formulario?.campos.splice(indice, 1);
    this.programarAutoGuardado();
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
    if (this.autoGuardadoTimer) { clearTimeout(this.autoGuardadoTimer); this.autoGuardadoTimer = null; }
    if (silencioso) this.autoGuardando = true;
    else this.guardando = true;

    this.grafoGuardar.guardar(
      silencioso,
      (p) => {
        if (silencioso) {
          if (this.politica) this.politica.estado = p.estado;
        } else {
          this.politica = p;
          this.grafoEstado.politica = p;
          // Resincronizar nodoSeleccionado con el nuevo objeto del servidor
          if (this.nodoSeleccionado) {
            const nodoActualizado = p.nodos?.find((n) => n.id === this.nodoSeleccionado!.id);
            this.nodoSeleccionado = nodoActualizado ?? null;
          }
        }
        this.guardando = false;
        this.autoGuardando = false;
        this.estadoGuardado = 'guardado';
        if (this.estadoGuardadoTimer) clearTimeout(this.estadoGuardadoTimer);
        this.estadoGuardadoTimer = setTimeout(() => {
          this.estadoGuardado = null;
          this.cdr.detectChanges();
        }, 3000);
        this.publicarCambioColaborativo();
      },
      () => {
        this.guardando = false;
        this.autoGuardando = false;
        this.estadoGuardado = null;
      },
    );
  }

  // ── CU-07: Validar y publicar política ─────────────────────────────────

  abrirDialogoPublicar(): void {
    if (!this.politica || this.politica.estado === 'PUBLICADA') return;
    const { errores, advertencias } = this.grafoGuardar.validarParaPublicar();
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
    if (!this.politica || !this.grafoEstado.grafo) return;

    // Limpiar el diagrama local
    this.politica.carriles = [];
    this.politica.nodos = [];
    this.politica.conexiones = [];

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

    // Sincronizar con el estado compartido y re-renderizar
    this.grafoEstado.politica = this.politica;
    this.limpiarTodosHighlights();
    this.grafoRender.destruir();
    this.inicializarGrafo();
    this.panelIaAbierto = false;
  }

  volverALista(): void {
    this.router.navigate(['/policy']);
  }

  // ── CU-10: highlights de selección remota ──────────────────────────────

  private colorParaUsuario(correo: string): string {
    if (!this.coloresRemoto.has(correo)) {
      const paleta = ['#e53935', '#8e24aa', '#1e88e5', '#00897b', '#f4511e', '#3949ab'];
      this.coloresRemoto.set(correo, paleta[this.coloresRemoto.size % paleta.length]);
    }
    return this.coloresRemoto.get(correo)!;
  }

  private mostrarSeleccionRemota(correo: string, nombre: string, celdaId: string, color: string): void {
    this.quitarSeleccionRemota(correo);
    const grafo = this.grafoEstado.grafo;
    if (!grafo) return;
    // Buscar en nodos primero, luego en carriles
    const celda = this.grafoEstado.celdaPorNodoId.get(celdaId)
      ?? this.grafoEstado.celdaPorCarrilId.get(celdaId);
    if (!celda) return;

    // Borde de color sobre el nodo
    const highlight = new CellHighlight(grafo, color, 3);
    highlight.highlight(grafo.getView().getState(celda));
    this.hl.set(correo, highlight);

    // Badge con el nombre flotante sobre el nodo
    const state = grafo.getView().getState(celda);
    if (state) {
      const badge = document.createElement('div');
      badge.className = 'badge-usuario-grafo';
      badge.style.background = color;
      badge.textContent = nombre;
      badge.dataset['celdaId'] = celdaId;
      this.posicionarBadge(badge, state);
      this.graphContainer.nativeElement.appendChild(badge);
      this.badges.set(correo, badge);
    }
  }

  private posicionarBadge(badge: HTMLElement, state: any): void {
    badge.style.left = state.x + 'px';
    badge.style.top = Math.max(0, state.y - 22) + 'px';
  }

  private actualizarPosicionesBadges(): void {
    const grafo = this.grafoEstado.grafo;
    if (!grafo) return;
    this.badges.forEach((badge) => {
      const celdaId = badge.dataset['celdaId'];
      if (!celdaId) return;
      const celda = this.grafoEstado.celdaPorNodoId.get(celdaId)
        ?? this.grafoEstado.celdaPorCarrilId.get(celdaId);
      if (!celda) return;
      const state = grafo.getView().getState(celda);
      if (state) this.posicionarBadge(badge, state);
    });
  }

  private quitarSeleccionRemota(correo: string): void {
    this.hl.get(correo)?.destroy();
    this.hl.delete(correo);
    this.badges.get(correo)?.remove();
    this.badges.delete(correo);
  }

  private limpiarTodosHighlights(): void {
    this.hl.forEach((h) => h.destroy());
    this.hl.clear();
    this.badges.forEach((el) => el.remove());
    this.badges.clear();
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
        const color = this.colorParaUsuario(mensaje.autorCorreo);
        if (mensaje.tipo === 'CAMBIO' && mensaje.payload) {
          this.aplicarCambioRemoto(mensaje.payload);
        } else if (mensaje.tipo === 'SELECCION_NODO' && mensaje.payload?.nodoId) {
          this.mostrarSeleccionRemota(mensaje.autorCorreo, mensaje.autorNombre, mensaje.payload.nodoId, color);
        } else if (mensaje.tipo === 'DESELECCION_NODO') {
          this.quitarSeleccionRemota(mensaje.autorCorreo);
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
    this.limpiarTodosHighlights();
    // El payload es SolicitudActualizarDiagrama con carriles/nodos/conexiones
    if (payload.carriles) this.politica.carriles = payload.carriles;
    if (payload.nodos) this.politica.nodos = payload.nodos;
    if (payload.conexiones) this.politica.conexiones = payload.conexiones;
    // Sincronizar con el estado compartido y re-renderizar
    this.grafoEstado.politica = this.politica;
    this.grafoRender.destruir();
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
}
