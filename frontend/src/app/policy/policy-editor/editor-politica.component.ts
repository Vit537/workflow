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
} from '../../shared/models/policy.model';
import { PoliticaService, SolicitudActualizarDiagrama } from '../../shared/services/politica.service';
import { DiagramaIA, AccionIA } from '../../shared/services/ia.service';
import { WebsocketService } from '../../shared/services/websocket.service';
import { AuthService } from '../../shared/services/auth.service';
import { Subscription } from 'rxjs';
import { CellHighlight } from '@maxgraph/core';
import { GrafoEstadoService } from './grafo-estado.service';
import { GrafoRenderService } from './grafo-render.service';
import { GrafoCarrilesService } from './grafo-carriles.service';
import { GrafoGuardarService } from './grafo-guardar.service';
import { GrafoIaService } from './grafo-ia.service';

@Component({
  selector: 'app-editor-politica',
  templateUrl: './editor-politica.component.html',
  styleUrls: ['./editor-politica.component.scss'],
  standalone: false,
  providers: [GrafoEstadoService, GrafoRenderService, GrafoCarrilesService, GrafoGuardarService, GrafoIaService],
})
export class EditorPoliticaComponent implements OnInit, OnDestroy {
  @ViewChild('graphContainer', { static: false }) graphContainer!: ElementRef<HTMLDivElement>;

  // Estado general
  politica: Politica | null = null;
  cargando = true;
  guardando = false;

  // Panel carril
  panelCarrilAbierto = false;
  carrilEditando: Carril | null = null;
  formularioCarril!: FormGroup;

  // Nodo seleccionado
  nodoSeleccionado: Nodo | null = null;
  haySeleccion = false;

  // Panel IA
  panelIaAbierto = false;

  // CU-07: publicar
  publicando = false;
  panelPublicarAbierto = false;
  erroresValidacion: string[] = [];
  advertenciasValidacion: string[] = [];
  validacionLimpia = false;

  // Auto-guardado
  autoGuardando = false;
  estadoGuardado: 'guardado' | 'pendiente' | null = null;
  private estadoGuardadoTimer: ReturnType<typeof setTimeout> | null = null;
  private autoGuardadoTimer: ReturnType<typeof setTimeout> | null = null;

  // CU-10: colaboracion
  usuariosPresentes: { correo: string; nombre: string }[] = [];
  private subColaborativo?: Subscription;
  private subPresencia?: Subscription;
  private hl = new Map<string, CellHighlight>();
  private badges = new Map<string, HTMLElement>();
  private coloresRemoto = new Map<string, string>();

  readonly tiposNodo: { tipo: TipoNodo; etiqueta: string; icono: string }[] = [
    { tipo: 'INICIO',             etiqueta: 'Inicio',   icono: 'play_circle' },
    { tipo: 'ACTIVIDAD',          etiqueta: 'Actividad', icono: 'task' },
    { tipo: 'DECISION',           etiqueta: 'Decision', icono: 'call_split' },
    { tipo: 'COMPUERTA_PARALELA', etiqueta: 'Paralela', icono: 'device_hub' },
    { tipo: 'COMPUERTA_UNION',    etiqueta: 'Union',    icono: 'merge_type' },
    { tipo: 'FIN',                etiqueta: 'Fin',      icono: 'stop_circle' },
  ];

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const enInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault(); this.guardarDiagrama(); return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z' && !enInput) {
      e.preventDefault();
      if (this.grafoEstado.undoManager?.canUndo()) { this.grafoEstado.undoManager.undo(); this.programarAutoGuardado(); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !enInput) {
      e.preventDefault();
      if (this.grafoEstado.undoManager?.canRedo()) { this.grafoEstado.undoManager.redo(); this.programarAutoGuardado(); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !enInput) { this.grafoCarriles.copiarSeleccion(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !enInput) {
      e.preventDefault(); this.grafoCarriles.pegarSeleccion(); this.programarAutoGuardado(); return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !enInput) { this.eliminarSeleccion(); }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private politicaService: PoliticaService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private wsService: WebsocketService,
    private authService: AuthService,
    private grafoEstado: GrafoEstadoService,
    private grafoRender: GrafoRenderService,
    private grafoCarriles: GrafoCarrilesService,
    private grafoGuardar: GrafoGuardarService,
    private grafoIa: GrafoIaService,
  ) {}

  ngOnInit(): void {
    this.formularioCarril = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      orientacion: ['columna'],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/policy']); return; }

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
        this.snackBar.open('Error al cargar la politica', 'Cerrar', { duration: 3000 });
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

  private inicializarGrafo(): void {
    const container = this.graphContainer.nativeElement;
    this.grafoRender.registrarCallbacks(
      () => this.programarAutoGuardado(),
      (celdaId) => {
        const politicaId = this.politica?.id;
        const usuario = this.authService.obtenerUsuarioActual();
        if (politicaId && usuario) {
          const msg = celdaId
            ? { tipo: 'SELECCION_NODO', politicaId, autorCorreo: usuario.correo, autorNombre: usuario.nombre, payload: { nodoId: celdaId } }
            : { tipo: 'DESELECCION_NODO', politicaId, autorCorreo: usuario.correo, autorNombre: usuario.nombre, payload: null };
          this.wsService.publicar(`/app/politicas/${politicaId}/colaborar`, msg);
        }
        if (!celdaId) { this.nodoSeleccionado = null; this.cdr.detectChanges(); return; }
        const nodo = this.politica?.nodos.find((n) => n.id === celdaId);
        this.nodoSeleccionado = nodo ?? null;
        this.cdr.detectChanges();
      },
      (haySel) => { this.haySeleccion = haySel; this.cdr.detectChanges(); },
    );
    this.grafoRender.inicializar(container);
    if (this.politica) {
      this.politica.carriles = this.grafoEstado.politica?.carriles ?? this.politica.carriles;
    }
    const grafo = this.grafoEstado.grafo;
    if (grafo) {
      const redraw = () => this.actualizarPosicionesBadges();
      grafo.getView().addListener('scale', redraw);
      grafo.getView().addListener('translate', redraw);
      grafo.getView().addListener('scaleAndTranslate', redraw);
    }
  }

  programarAutoGuardado(): void {
    if (this.autoGuardadoTimer) clearTimeout(this.autoGuardadoTimer);
    this.estadoGuardado = 'pendiente';
    this.autoGuardadoTimer = setTimeout(() => this.guardarDiagrama(true), 2500);
  }

  agregarNodo(tipo: TipoNodo, etiqueta: string): void {
    this.grafoCarriles.agregarNodo(tipo, etiqueta);
    this.politica = this.grafoEstado.politica;
  }

  agregarCarril(): void {
    this.carrilEditando = this.grafoCarriles.agregarCarril(this.formularioCarril, this.carrilEditando);
    this.formularioCarril.reset({ orientacion: 'columna' });
    this.panelCarrilAbierto = false;
    if (!this.carrilEditando) this.programarAutoGuardado();
  }

  editarCarril(carril: Carril): void {
    if (this.politica?.estado === 'PUBLICADA') return;
    this.carrilEditando = carril;
    this.grafoCarriles.editarCarril(carril, this.formularioCarril);
    this.panelCarrilAbierto = true;
  }

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
          if (this.nodoSeleccionado) {
            const actualizado = p.nodos?.find((n: Nodo) => n.id === this.nodoSeleccionado!.id);
            this.nodoSeleccionado = actualizado ?? null;
          }
        }
        this.guardando = false; this.autoGuardando = false; this.estadoGuardado = 'guardado';
        if (this.estadoGuardadoTimer) clearTimeout(this.estadoGuardadoTimer);
        this.estadoGuardadoTimer = setTimeout(() => { this.estadoGuardado = null; this.cdr.detectChanges(); }, 3000);
        this.publicarCambioColaborativo();
      },
      () => { this.guardando = false; this.autoGuardando = false; this.estadoGuardado = null; },
    );
  }

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
      next: (p) => { this.politica = p; this.publicando = false; this.snackBar.open('Politica publicada exitosamente!', 'Cerrar', { duration: 3000 }); },
      error: (err) => { this.publicando = false; this.snackBar.open(err?.error?.mensaje ?? 'Error al publicar la politica', 'Cerrar', { duration: 4000 }); },
    });
  }

  onDiagramaCreado(diagrama: DiagramaIA): void {
    this.grafoIa.aplicarDiagrama(diagrama);
    this.reiniciarGrafo();
    setTimeout(() => this.guardarDiagrama(false), 300);
  }

  onAccionesAplicar(acciones: AccionIA[]): void {
    this.grafoIa.ejecutarAcciones(acciones);
    this.reiniciarGrafo();
    setTimeout(() => this.guardarDiagrama(false), 300);
  }

  private reiniciarGrafo(): void {
    this.limpiarTodosHighlights();
    this.grafoRender.destruir();
    this.panelIaAbierto = false;
    this.inicializarGrafo();
  }

  volverALista(): void { this.router.navigate(['/policy']); }

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
    const celda = this.grafoEstado.celdaPorNodoId.get(celdaId) ?? this.grafoEstado.celdaPorCarrilId.get(celdaId);
    if (!celda) return;
    const highlight = new CellHighlight(grafo, color, 3);
    highlight.highlight(grafo.getView().getState(celda));
    this.hl.set(correo, highlight);
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
      const celda = this.grafoEstado.celdaPorNodoId.get(celdaId) ?? this.grafoEstado.celdaPorCarrilId.get(celdaId);
      if (!celda) return;
      const state = grafo.getView().getState(celda);
      if (state) this.posicionarBadge(badge, state);
    });
  }

  private quitarSeleccionRemota(correo: string): void {
    this.hl.get(correo)?.destroy(); this.hl.delete(correo);
    this.badges.get(correo)?.remove(); this.badges.delete(correo);
  }

  private limpiarTodosHighlights(): void {
    this.hl.forEach((h) => h.destroy()); this.hl.clear();
    this.badges.forEach((el) => el.remove()); this.badges.clear();
  }

  private iniciarColaboracion(politicaId: string): void {
    const usuario = this.authService.obtenerUsuarioActual();
    if (!usuario) return;
    this.wsService.conectar();
    this.subColaborativo = this.wsService.suscribir<any>(`/topic/politicas/${politicaId}`).subscribe((mensaje) => {
      if (mensaje.autorCorreo === usuario.correo) return;
      const color = this.colorParaUsuario(mensaje.autorCorreo);
      if (mensaje.tipo === 'CAMBIO' && mensaje.payload) { this.aplicarCambioRemoto(mensaje.payload); }
      else if (mensaje.tipo === 'SELECCION_NODO' && mensaje.payload?.nodoId) { this.mostrarSeleccionRemota(mensaje.autorCorreo, mensaje.autorNombre, mensaje.payload.nodoId, color); }
      else if (mensaje.tipo === 'DESELECCION_NODO') { this.quitarSeleccionRemota(mensaje.autorCorreo); }
    });
    this.subPresencia = this.wsService.suscribir<any>(`/topic/politicas/${politicaId}/presencia`).subscribe((msg) => {
      if (msg.tipo === 'ENTRO') {
        if (!this.usuariosPresentes.find(u => u.correo === msg.correo))
          this.usuariosPresentes = [...this.usuariosPresentes, { correo: msg.correo, nombre: msg.nombre }];
      } else {
        this.usuariosPresentes = this.usuariosPresentes.filter(u => u.correo !== msg.correo);
      }
    });
    this.wsService.publicar(`/app/politicas/${politicaId}/presencia`, { tipo: 'ENTRO', politicaId, correo: usuario.correo, nombre: usuario.nombre });
  }

  private detenerColaboracion(): void {
    const politicaId = this.politica?.id;
    const usuario = this.authService.obtenerUsuarioActual();
    if (politicaId && usuario) {
      this.wsService.publicar(`/app/politicas/${politicaId}/presencia`, { tipo: 'SALIO', politicaId, correo: usuario.correo, nombre: usuario.nombre });
    }
    this.subColaborativo?.unsubscribe();
    this.subPresencia?.unsubscribe();
    this.wsService.desconectar();
  }

  private aplicarCambioRemoto(payload: any): void {
    if (!this.politica) return;
    this.limpiarTodosHighlights();
    if (payload.carriles) this.politica.carriles = payload.carriles;
    if (payload.nodos)    this.politica.nodos    = payload.nodos;
    if (payload.conexiones) this.politica.conexiones = payload.conexiones;
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
      carriles: this.politica!.carriles, nodos: this.politica!.nodos, conexiones: this.politica!.conexiones,
    };
    this.wsService.publicar(`/app/politicas/${politicaId}/colaborar`, {
      tipo: 'CAMBIO', politicaId, autorCorreo: usuario.correo, autorNombre: usuario.nombre, payload,
    });
  }
}
