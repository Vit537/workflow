import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ConsultaService, RespuestaVerificacion } from '../../shared/services/consulta.service';
import { Consulta } from '../../shared/models/consulta.model';
import { MensajeConsulta } from '../../shared/models/cliente.model';
import { PoliticaService } from '../../shared/services/politica.service';
import { PoliticaResumen } from '../../shared/models/policy.model';
import { AuthService } from '../../shared/services/auth.service';
import { WebsocketService } from '../../shared/services/websocket.service';
import { TramiteService, RespuestaPaso } from '../../shared/services/tramite.service';
import { DocumentoService } from '../../shared/services/documento.service';
import { MatSnackBar } from '@angular/material/snack-bar';


@Component({
  selector: 'app-detalle-consulta',
  templateUrl: './detalle-consulta.component.html',
  styleUrls: ['./detalle-consulta.component.scss'],
  standalone: false,
})
export class DetalleConsultaComponent implements OnInit, OnDestroy {
  consulta: Consulta | null = null;
  cargando = true;
  enviando = false;
  error = '';
  exito = '';

  mensajeAsesor = '';
  politicaId = '';

  // Políticas publicadas para el selector
  politicas: PoliticaResumen[] = [];
  cargandoPoliticas = false;

  // Verificación de cliente
  verificando = false;
  correoVerificacion = '';
  descripcionVerificacion = '';
  resultadoVerificacion: RespuestaVerificacion | null = null;

  // Chat con el cliente
  mensajes: MensajeConsulta[] = [];
  nuevoMensaje = '';
  miId = '';
  /** 0 = Atención, 1 = Chat, 2 = Datos del cliente. Se abre en Chat si se llega desde "Chats". */
  tabSeleccionada = 0;
  private subMensajes?: Subscription;

  // Datos enviados por el cliente (formularios + archivos del trámite)
  pasos: RespuestaPaso[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private consultaService: ConsultaService,
    private politicaService: PoliticaService,
    private auth: AuthService,
    private ws: WebsocketService,
    private tramiteService: TramiteService,
    private documentoService: DocumentoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarPoliticas();
    this.miId = this.auth.obtenerUsuarioActual()?.id ?? '';
    if (history.state?.tab === 'chat') this.tabSeleccionada = 1;

    // Si venimos desde la lista, el objeto ya está en el state del router → no hay llamada HTTP
    const stateConsulta = history.state?.consulta as Consulta | undefined;
    if (stateConsulta?.id) {
      this.consulta = stateConsulta;
      this.mensajeAsesor = stateConsulta.mensajeAsesor ?? '';
      this.politicaId = '';
      this.correoVerificacion = stateConsulta.clienteCorreo ?? '';
      this.cargando = false;
      this.iniciarChat(stateConsulta.id);
      this.cargarDatosCliente(stateConsulta.tramiteId);
      return;
    }

    // Fallback: navegación directa por URL → buscar en backend
    const id = this.route.snapshot.paramMap.get('id')!;
    this.consultaService.obtener(id).subscribe({
      next: (c) => {
        this.consulta = c;
        this.mensajeAsesor = c.mensajeAsesor ?? '';
        this.politicaId = '';
        this.correoVerificacion = c.clienteCorreo ?? '';
        this.cargando = false;
        this.iniciarChat(c.id);
        this.cargarDatosCliente(c.tramiteId);
      },
      error: () => {
        this.error = 'No se pudo cargar la consulta';
        this.cargando = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.subMensajes?.unsubscribe();
  }

  // ── Chat con el cliente ────────────────────────────────────────────────
  private iniciarChat(consultaId: string): void {
    this.cargarMensajes(consultaId);
    this.ws.conectar();
    this.subMensajes = this.ws
      .suscribir<MensajeConsulta>(`/topic/consultas/${consultaId}/mensajes`)
      .subscribe((m) => { if (m.autorId !== this.miId) this.mensajes = [...this.mensajes, m]; });
  }

  cargarMensajes(consultaId: string): void {
    this.consultaService.mensajes(consultaId).subscribe({
      next: (m) => this.mensajes = m,
      error: () => {},
    });
  }

  enviarMensaje(): void {
    const texto = this.nuevoMensaje.trim();
    if (!texto || !this.consulta) return;
    this.consultaService.enviarMensaje(this.consulta.id, texto).subscribe({
      next: (m) => { this.mensajes = [...this.mensajes, m]; this.nuevoMensaje = ''; },
      error: () => this.snackBar.open('No se pudo enviar el mensaje.', 'Cerrar', { duration: 3000 }),
    });
  }

  esMio(m: MensajeConsulta): boolean { return m.autorId === this.miId; }

  // ── Datos enviados por el cliente ──────────────────────────────────────
  private cargarDatosCliente(tramiteId?: string): void {
    if (!tramiteId) { this.pasos = []; return; }
    this.tramiteService.obtenerTramite(tramiteId).subscribe({
      next: (t) => this.pasos = t.pasos ?? [],
      error: () => this.pasos = [],
    });
  }

  /** Pasos que ya tienen algún dato/archivo enviado por el cliente. */
  get pasosConDatos(): RespuestaPaso[] {
    return this.pasos.filter(p => p.datosFormulario && Object.keys(p.datosFormulario).length > 0);
  }

  entradasDatos(p: RespuestaPaso): { campo: string; valor: unknown }[] {
    return Object.entries(p.datosFormulario ?? {}).map(([campo, valor]) => ({ campo, valor }));
  }

  /** Etiqueta legible de un campo (desde la definición del formulario). */
  etiquetaCampo(p: RespuestaPaso, nombre: string): string {
    return p.formulario?.campos?.find(c => c.nombre === nombre)?.etiqueta ?? nombre;
  }

  /** true si el campo es de tipo ARCHIVO → el valor es el id de un documento descargable. */
  esCampoArchivo(p: RespuestaPaso, nombre: string): boolean {
    return p.formulario?.campos?.find(c => c.nombre === nombre)?.tipoCampo === 'ARCHIVO';
  }

  descargarDocumento(documentoId: unknown): void {
    if (typeof documentoId !== 'string' || !documentoId) return;
    this.documentoService.descargarActual(documentoId).subscribe({
      next: (resp) => this.documentoService.guardarBlob(resp, 'documento-cliente'),
      error: () => this.snackBar.open('No se pudo descargar el documento.', 'Cerrar', { duration: 3000 }),
    });
  }

  private cargarPoliticas(): void {
    this.cargandoPoliticas = true;
    this.politicaService.listarPoliticas('PUBLICADA').subscribe({
      next: (ps) => { this.politicas = ps; this.cargandoPoliticas = false; },
      error: () => { this.cargandoPoliticas = false; },
    });
  }

  verificarCliente(): void {
    if (!this.correoVerificacion.trim()) return;
    this.verificando = true;
    this.resultadoVerificacion = null;
    this.consultaService.verificar(
      this.correoVerificacion.trim(),
      this.descripcionVerificacion.trim() || undefined
    ).subscribe({
      next: (r) => { this.resultadoVerificacion = r; this.verificando = false; },
      error: (err) => {
        this.verificando = false;
        this.error = err?.error?.mensaje ?? 'Error al verificar cliente';
      },
    });
  }

  atender(): void {
    if (!this.consulta || !this.mensajeAsesor.trim()) return;
    this.enviando = true;
    this.error = '';
    this.exito = '';
    const body: { mensajeAsesor: string; politicaId?: string } = {
      mensajeAsesor: this.mensajeAsesor,
    };
    if (this.politicaId.trim()) body.politicaId = this.politicaId.trim();

    this.consultaService.atender(this.consulta.id, body).pipe(timeout(15000)).subscribe({
      next: (actualizada) => {
        this.consulta = actualizada;
        this.exito = 'Consulta atendida y notificación enviada al cliente.';
        this.enviando = false;
        this.snackBar.open('✓ Consulta atendida. Notificación enviada al cliente.', 'OK', { duration: 3500 });
      },
      error: (err) => {
        const msg = err instanceof TimeoutError
          ? 'Tiempo de espera agotado. Intenta de nuevo.'
          : (err?.error?.mensaje ?? 'Error al atender la consulta');
        this.error = msg;
        this.enviando = false;
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  completar(): void {
    if (!this.consulta) return;
    this.enviando = true;
    this.error = '';
    this.exito = '';
    this.consultaService.completar(this.consulta.id).pipe(timeout(15000)).subscribe({
      next: (actualizada) => {
        this.consulta = actualizada;
        this.exito = 'Consulta marcada como completada. Cliente notificado.';
        this.enviando = false;
        this.snackBar.open('✓ Consulta completada. Cliente notificado.', 'OK', { duration: 3500 });
      },
      error: (err) => {
        const msg = err instanceof TimeoutError
          ? 'Tiempo de espera agotado. Intenta de nuevo.'
          : (err?.error?.mensaje ?? 'Error al completar la consulta');
        this.error = msg;
        this.enviando = false;
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  volver(): void {
    this.router.navigate(['/workflow/consultas']);
  }
}
