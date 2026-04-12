import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
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
  formularioCarril!: FormGroup;

  // CU-07: publicar
  publicando = false;

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

    const edgeStyle = this.grafo.getStylesheet().getDefaultEdgeStyle();
    edgeStyle.rounded = true;

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
  }

  private crearEstructuraInicial(): void {
    const padre = this.grafo.getDefaultParent();
    this.grafo.batchUpdate(() => {
      const carrilId = this.generarId();
      const swimlane = this.grafo.insertVertex(
        padre,
        carrilId,
        'Área Principal',
        0,
        0,
        800,
        200,
        { shape: 'swimlane', horizontal: false, startSize: 30 }
      );
      this.celdaPorCarrilId.set(carrilId, swimlane);
      if (this.politica) {
        this.politica.carriles = [{ id: carrilId, nombre: 'Área Principal', orden: 0 }];
      }
    });
  }

  private cargarDiagramaExistente(): void {
    if (!this.politica) return;
    const padre = this.grafo.getDefaultParent();

    this.grafo.batchUpdate(() => {
      this.politica!.carriles.forEach((carril, idx) => {
        const swimlane = this.grafo.insertVertex(
          padre,
          carril.id,
          carril.nombre,
          0,
          idx * 200,
          800,
          200,
          { shape: 'swimlane', horizontal: false, startSize: 30 }
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
    const orden = this.politica.carriles.length;
    const carrilId = this.generarId();
    const padre = this.grafo.getDefaultParent();

    this.grafo.batchUpdate(() => {
      const swimlane = this.grafo.insertVertex(
        padre,
        carrilId,
        nombre,
        0,
        orden * 200,
        800,
        200,
        { shape: 'swimlane', horizontal: false, startSize: 30 }
      );
      this.celdaPorCarrilId.set(carrilId, swimlane);
    });

    this.politica.carriles.push({ id: carrilId, nombre, orden });
    this.formularioCarril.reset();
    this.panelCarrilAbierto = false;
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
    this.nodoSeleccionado.tipoFlujo = this.formularioFlujo.value.tipoFlujo;
    this.snackBar.open('Tipo de flujo actualizado. Recuerda guardar el diagrama.', 'Cerrar', {
      duration: 2500,
    });
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

  guardarDiagrama(): void {
    if (!this.politica) return;
    this.guardando = true;

    this.politica.nodos.forEach((nodo) => {
      const celda = this.celdaPorNodoId.get(nodo.id);
      if (celda?.geometry) {
        nodo.posX = celda.geometry.x;
        nodo.posY = celda.geometry.y;
        nodo.ancho = celda.geometry.width;
        nodo.alto = celda.geometry.height;
      }
    });

    const solicitud: SolicitudActualizarDiagrama = {
      carriles: this.politica.carriles,
      nodos: this.politica.nodos,
      conexiones: this.politica.conexiones,
    };

    this.politicaService.actualizarDiagrama(this.politica.id, solicitud).subscribe({
      next: (p) => {
        this.politica = p;
        this.guardando = false;
        this.snackBar.open('Diagrama guardado', 'Cerrar', { duration: 2000 });
        this.publicarCambioColaborativo();
      },
      error: () => {
        this.guardando = false;
        this.snackBar.open('Error al guardar el diagrama', 'Cerrar', { duration: 3000 });
      },
    });
  }

  // ── CU-07: Publicar política ───────────────────────────────────────────

  publicarPolitica(): void {
    if (!this.politica) return;
    this.publicando = true;
    this.politicaService.publicarPolitica(this.politica.id).subscribe({
      next: (p) => {
        this.politica = p;
        this.publicando = false;
        this.snackBar.open('Política publicada correctamente', 'Cerrar', { duration: 3000 });
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

    // Re-renderizar el grafo
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
