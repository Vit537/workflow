import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ClienteConsultaService } from '../../shared/services/cliente-consulta.service';
import { ClienteAuthService } from '../../shared/services/cliente-auth.service';
import { WebsocketService } from '../../shared/services/websocket.service';
import { ConsultaDetalle, MensajeConsulta, EstadoConsulta } from '../../shared/models/cliente.model';
import { RespuestaPaso } from '../../shared/services/tramite.service';
import { CampoFormulario } from '../../shared/models/policy.model';

@Component({
  selector: 'app-detalle-consulta',
  templateUrl: './detalle-consulta.component.html',
  styleUrls: ['./detalle-consulta.component.scss'],
  standalone: false,
})
export class DetalleConsultaComponent implements OnInit, OnDestroy {
  consultaId!: string;
  detalle?: ConsultaDetalle;
  cargando = false;
  subiendo = false;
  enviandoDatos = false;

  /** Valores que el cliente escribe en el formulario del paso actual. */
  datosForm: Record<string, unknown> = {};

  mensajes: MensajeConsulta[] = [];
  nuevoMensaje = '';
  miId = '';
  private subMensajes?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private servicio: ClienteConsultaService,
    private auth: ClienteAuthService,
    private ws: WebsocketService,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.consultaId = this.route.snapshot.paramMap.get('id')!;
    this.miId = this.auth.obtenerUsuarioActual()?.id ?? '';
    this.cargar();
    this.cargarMensajes();

    this.ws.conectar();
    this.subMensajes = this.ws.suscribir<MensajeConsulta>(`/topic/consultas/${this.consultaId}/mensajes`)
      .subscribe((m) => { if (m.autorId !== this.miId) this.mensajes = [...this.mensajes, m]; });
  }

  ngOnDestroy(): void { this.subMensajes?.unsubscribe(); }

  cargar(): void {
    this.cargando = true;
    this.servicio.detalle(this.consultaId).pipe(
      finalize(() => { this.cargando = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: (d) => { this.detalle = d; this.cargando = false; },
      error: () => { this.cargando = false; this.snack.open('No se pudo cargar la consulta.', 'Cerrar', { duration: 3000 }); },
    });
  }

  cargarMensajes(): void {
    this.servicio.mensajes(this.consultaId).subscribe({
      next: (m) => this.mensajes = m,
      error: () => { },
    });
  }

  // ── Progreso ───────────────────────────────────────────────────────────
  get pasos(): RespuestaPaso[] { return this.detalle?.tramite?.pasos ?? []; }

  estaHecho(p: RespuestaPaso): boolean { return p.estado === 'COMPLETADO'; }

  /** Primer paso no completado = lo que falta hacer ahora. */
  get pasoActual(): RespuestaPaso | undefined {
    return this.pasos.find(p => p.estado !== 'COMPLETADO');
  }

  /** El paso actual pide subir documentos solo si el admin lo configuró. */
  get requiereDocumentos(): boolean {
    return !!this.pasoActual?.formulario?.requiereDocumentos;
  }

  /** Campos de texto/numero/etc. del formulario del paso actual (los de archivo van aparte). */
  get camposFormulario(): CampoFormulario[] {
    return (this.pasoActual?.formulario?.campos ?? []).filter(c => c.tipoCampo !== 'ARCHIVO');
  }

  // ── Envío de datos del formulario del paso actual ────────────────────────
  enviarDatos(): void {
    const tramiteId = this.detalle?.tramiteId;
    const paso = this.pasoActual;
    if (!tramiteId || !paso) return;

    this.enviandoDatos = true;
    this.servicio.enviarDatos(tramiteId, paso.nodoId, this.datosForm).subscribe({
      next: () => {
        this.enviandoDatos = false;
        this.snack.open('Datos enviados al asesor.', 'Cerrar', { duration: 2500 });
        this.cargar();
      },
      error: () => { this.enviandoDatos = false; this.snack.open('No se pudieron enviar los datos.', 'Cerrar', { duration: 3000 }); },
    });
  }

  // ── Subida de archivos al paso actual ────────────────────────────────────
  onArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    const tramiteId = this.detalle?.tramiteId;
    const paso = this.pasoActual;
    if (!archivo || !tramiteId || !paso) return;

    // Usa el primer campo de tipo ARCHIVO si existe; si no, "documento".
    const campoArchivo = paso.formulario?.campos?.find(c => c.tipoCampo === 'ARCHIVO')?.nombre ?? 'documento';

    this.subiendo = true;
    this.servicio.subirArchivo(tramiteId, paso.nodoId, campoArchivo, archivo).subscribe({
      next: () => {
        this.subiendo = false;
        input.value = '';
        this.snack.open('Archivo enviado al asesor.', 'Cerrar', { duration: 2500 });
        this.cargar();
      },
      error: () => { this.subiendo = false; this.snack.open('No se pudo subir el archivo.', 'Cerrar', { duration: 3000 }); },
    });
  }

  // ── Mensajería ───────────────────────────────────────────────────────────
  enviar(): void {
    const texto = this.nuevoMensaje.trim();
    if (!texto) return;
    this.servicio.enviarMensaje(this.consultaId, texto).subscribe({
      next: (m) => { this.mensajes = [...this.mensajes, m]; this.nuevoMensaje = ''; },
      error: () => this.snack.open('No se pudo enviar el mensaje.', 'Cerrar', { duration: 3000 }),
    });
  }

  esMio(m: MensajeConsulta): boolean { return m.autorId === this.miId; }

  volver(): void { this.router.navigate(['/cliente/consultas']); }

  textoEstado(estado?: EstadoConsulta): string {
    return estado === 'COMPLETADA' ? 'Completada' : estado === 'EN_ATENCION' ? 'En atención' : 'Pendiente';
  }
}
