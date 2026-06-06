import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  HostBinding,
  HostListener,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocumentoService } from '../../../shared/services/documento.service';
import { AuthService } from '../../../shared/services/auth.service';
import { WebsocketService } from '../../../shared/services/websocket.service';
import {
  Documento,
  VersionDocumento,
  LogDocumento,
  Responsable,
  RolDocumental,
  AccionDocumento,
  EventoDocumento,
  PresenciaDocumento,
  ComentarioDocumento,
} from '../../../shared/models/documento.model';

/**
 * Repositorio documental de una política: lista los documentos, permite subir nuevos,
 * subir versiones, descargar, ver el historial de versiones y restaurar versiones anteriores.
 * Se muestra como modal flotante centrado.
 */
@Component({
  selector: 'app-repositorio-documental',
  templateUrl: './repositorio-documental.component.html',
  styleUrls: ['./repositorio-documental.component.scss'],
  standalone: false,
})
export class RepositorioDocumentalComponent implements OnChanges, OnDestroy {
  @Input() abierto = false;
  @Input() politicaId: string | null = null;
  @Input() soloLectura = false;
  @Output() cerrado = new EventEmitter<void>();

  @HostBinding('class.visible') get visible() { return this.abierto; }

  documentos: Documento[] = [];
  cargando = false;
  subiendo = false;

  /** Documento cuyo historial está expandido (null = ninguno). */
  expandidoId: string | null = null;
  /** Versiones cargadas por documento (al expandir). */
  versionesPorDoc: Record<string, VersionDocumento[]> = {};
  /** Comentarios cargados del documento expandido. */
  comentariosDoc: ComentarioDocumento[] = [];
  nuevoComentario = '';

  // ── F7: Colaboración en tiempo real ──────────────────────────────────────
  /** Usuarios presentes en el documento expandido (por correo). */
  presentes: PresenciaDocumento[] = [];
  private subEventos?: Subscription;
  private subPresencia?: Subscription;

  /** Documento destino al elegir archivo (null = crear documento nuevo). */
  private destinoVersionId: string | null = null;

  // ── Co-edición en vivo (OnlyOffice) ───────────────────────────────────────
  /** Documento abierto en el editor en vivo (null = ninguno). */
  editorAbiertoId: string | null = null;
  editorTitulo = '';

  // ── F6: Responsables y logs ───────────────────────────────────────────────
  esAdmin = false;
  responsables: Responsable[] = [];
  cargandoResponsables = false;
  nuevoCorreo = '';
  nuevoRol: RolDocumental = 'EDITOR';
  readonly rolesDisponibles: RolDocumental[] = ['PROPIETARIO', 'EDITOR', 'COMENTARISTA', 'LECTOR'];

  logs: LogDocumento[] = [];
  cargandoLogs = false;

  constructor(
    private documentoService: DocumentoService,
    private snackBar: MatSnackBar,
    private auth: AuthService,
    private ws: WebsocketService,
  ) {
    this.esAdmin = this.auth.obtenerRol() === 'ADMIN';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['abierto'] && this.abierto && this.politicaId) {
      this.ws.conectar();
      this.cargar();
      this.responsables = [];
      this.logs = [];
    }
    if (changes['abierto'] && !this.abierto) {
      this.dejarDocumento();
    }
  }

  ngOnDestroy(): void {
    this.dejarDocumento();
  }

  /** Carga perezosa al cambiar de pestaña: 1 = Responsables, 2 = Actividad. */
  onTab(indice: number): void {
    if (indice === 1 && this.responsables.length === 0) this.cargarResponsables();
    if (indice === 2) this.cargarLogs();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto) this.cerrado.emit();
  }

  cargar(): void {
    if (!this.politicaId) return;
    this.cargando = true;
    this.documentoService.listarPorPolitica(this.politicaId).subscribe({
      next: (docs) => { this.documentos = docs; this.cargando = false; },
      error: () => {
        this.cargando = false;
        this.snackBar.open('No se pudieron cargar los documentos.', 'Cerrar', { duration: 3000 });
      },
    });
  }

  // ── Subida ──────────────────────────────────────────────────────────────

  pedirArchivoNuevo(input: HTMLInputElement): void {
    this.destinoVersionId = null;
    input.value = '';
    input.click();
  }

  pedirNuevaVersion(documentoId: string, input: HTMLInputElement): void {
    this.destinoVersionId = documentoId;
    input.value = '';
    input.click();
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo || !this.politicaId) return;

    this.subiendo = true;
    const peticion = this.destinoVersionId
      ? this.documentoService.subirVersion(this.destinoVersionId, archivo)
      : this.documentoService.crearDocumento(this.politicaId, archivo);

    peticion.subscribe({
      next: () => {
        this.subiendo = false;
        this.snackBar.open('Documento subido.', 'Cerrar', { duration: 2000 });
        this.versionesPorDoc = {};
        this.cargar();
      },
      error: (e) => {
        this.subiendo = false;
        this.snackBar.open(this.mensajeError(e, 'No se pudo subir el archivo.'), 'Cerrar', { duration: 3500 });
      },
    });
  }

  // ── Descargas ─────────────────────────────────────────────────────────────

  descargar(doc: Documento): void {
    this.documentoService.descargarActual(doc.id).subscribe({
      next: (resp) => this.documentoService.guardarBlob(resp, doc.nombre),
      error: () => this.snackBar.open('No se pudo descargar.', 'Cerrar', { duration: 3000 }),
    });
  }

  descargarVersion(doc: Documento, version: VersionDocumento): void {
    this.documentoService.descargarVersion(doc.id, version.numero).subscribe({
      next: (resp) => this.documentoService.guardarBlob(resp, version.nombreArchivo),
      error: () => this.snackBar.open('No se pudo descargar la versión.', 'Cerrar', { duration: 3000 }),
    });
  }

  // ── Co-edición en vivo (OnlyOffice) ───────────────────────────────────────

  /** ¿Se ofrece "Editar en línea" para este documento? */
  puedeEditarEnVivo(doc: Documento): boolean {
    return !!doc.editableEnVivo && doc.estado !== 'ARCHIVADO';
  }

  abrirEditor(doc: Documento): void {
    this.editorTitulo = doc.ultimaVersion?.nombreArchivo || doc.nombre;
    this.editorAbiertoId = doc.id;
  }

  onEditorCerrado(): void {
    this.editorAbiertoId = null;
    // El backend ya guardó la versión nueva (callback); refrescar lista y detalle si está abierto.
    this.cargar();
    if (this.expandidoId) this.cargarDetalle(this.expandidoId);
  }

  // ── Historial de versiones ────────────────────────────────────────────────

  toggleHistorial(doc: Documento): void {
    if (this.expandidoId === doc.id) {
      this.dejarDocumento();
      return;
    }
    this.entrarDocumento(doc);
  }

  /** Abre un documento: carga su detalle y se conecta a su sala en tiempo real. */
  private entrarDocumento(doc: Documento): void {
    this.dejarDocumento();
    this.expandidoId = doc.id;
    this.cargarDetalle(doc.id);

    // Eventos del documento (nueva versión, comentario, bloqueo) → refrescar.
    this.subEventos = this.ws.suscribir<EventoDocumento>(`/topic/documentos/${doc.id}`)
      .subscribe(() => { this.cargarDetalle(doc.id); this.cargar(); });

    // Presencia de otros usuarios.
    this.subPresencia = this.ws.suscribir<PresenciaDocumento>(`/topic/documentos/${doc.id}/presencia`)
      .subscribe((p) => this.registrarPresencia(p));

    this.publicarPresencia(doc.id, 'ENTRO');
  }

  /** Cierra el documento expandido y abandona su sala. */
  private dejarDocumento(): void {
    if (this.expandidoId) this.publicarPresencia(this.expandidoId, 'SALIO');
    this.subEventos?.unsubscribe();
    this.subPresencia?.unsubscribe();
    this.subEventos = undefined;
    this.subPresencia = undefined;
    this.presentes = [];
    this.comentariosDoc = [];
    this.expandidoId = null;
  }

  private cargarDetalle(documentoId: string): void {
    this.documentoService.obtener(documentoId).subscribe({
      next: (detalle) => {
        this.versionesPorDoc[documentoId] = (detalle.versiones ?? []).slice().reverse();
        this.comentariosDoc = detalle.comentarios ?? [];
        // Reflejar cambios de estado (bloqueo) en la lista.
        const i = this.documentos.findIndex((d) => d.id === documentoId);
        if (i >= 0) this.documentos[i] = { ...this.documentos[i], ...detalle };
      },
      error: () => this.snackBar.open('No se pudo cargar el historial.', 'Cerrar', { duration: 3000 }),
    });
  }

  restaurar(doc: Documento, version: VersionDocumento): void {
    this.documentoService.restaurarVersion(doc.id, version.numero).subscribe({
      next: () => {
        this.snackBar.open(`Restaurada la versión ${version.numero}.`, 'Cerrar', { duration: 2500 });
        this.cargarDetalle(doc.id);
        this.cargar();
      },
      error: (e) => this.snackBar.open(this.mensajeError(e, 'No se pudo restaurar.'), 'Cerrar', { duration: 3500 }),
    });
  }

  // ── F7: Bloqueo (check-out) ───────────────────────────────────────────────

  bloquear(doc: Documento): void {
    this.documentoService.bloquear(doc.id).subscribe({
      next: () => { this.snackBar.open('Tomaste la edición de este documento.', 'Cerrar', { duration: 2000 }); this.cargar(); },
      error: (e) => this.snackBar.open(this.mensajeError(e, 'No se pudo tomar la edición.'), 'Cerrar', { duration: 3500 }),
    });
  }

  desbloquear(doc: Documento): void {
    this.documentoService.desbloquear(doc.id).subscribe({
      next: () => { this.snackBar.open('Liberaste el documento.', 'Cerrar', { duration: 2000 }); this.cargar(); },
      error: (e) => this.snackBar.open(this.mensajeError(e, 'No se pudo liberar.'), 'Cerrar', { duration: 3500 }),
    });
  }

  /** ¿El bloqueo lo tiene el usuario actual? (para mostrar "Liberar" en vez de "Tomar"). */
  loBloqueoYo(doc: Documento): boolean {
    return !!doc.bloqueadoPor && doc.bloqueadoPor === this.auth.obtenerUsuarioActual()?.id;
  }

  // ── F7: Comentarios ───────────────────────────────────────────────────────

  enviarComentario(doc: Documento): void {
    const texto = this.nuevoComentario.trim();
    if (!texto) return;
    this.documentoService.comentar(doc.id, texto).subscribe({
      next: (detalle) => {
        this.comentariosDoc = detalle.comentarios ?? [];
        this.nuevoComentario = '';
      },
      error: (e) => this.snackBar.open(this.mensajeError(e, 'No se pudo comentar.'), 'Cerrar', { duration: 3500 }),
    });
  }

  // ── F7: Presencia ───────────────────────────────────────────────────────

  private publicarPresencia(documentoId: string, accion: 'ENTRO' | 'SALIO' | 'EDITANDO'): void {
    const u = this.auth.obtenerUsuarioActual();
    this.ws.publicar(`/app/documentos/${documentoId}/presencia`, {
      documentoId,
      usuarioCorreo: u?.correo ?? '',
      usuarioNombre: u?.nombre ?? u?.correo ?? 'Usuario',
      accion,
    });
  }

  private registrarPresencia(p: PresenciaDocumento): void {
    const miCorreo = this.auth.obtenerUsuarioActual()?.correo;
    if (p.usuarioCorreo === miCorreo) return; // no mostrarme a mí mismo
    if (p.accion === 'SALIO') {
      this.presentes = this.presentes.filter((x) => x.usuarioCorreo !== p.usuarioCorreo);
    } else if (!this.presentes.some((x) => x.usuarioCorreo === p.usuarioCorreo)) {
      this.presentes = [...this.presentes, p];
    }
  }

  archivar(doc: Documento): void {
    if (!confirm(`¿Archivar el documento "${doc.nombre}"?`)) return;
    this.documentoService.archivar(doc.id).subscribe({
      next: () => {
        this.snackBar.open('Documento archivado.', 'Cerrar', { duration: 2000 });
        this.cargar();
      },
      error: (e) => this.snackBar.open(this.mensajeError(e, 'No se pudo archivar.'), 'Cerrar', { duration: 3500 }),
    });
  }

  // ── Utilidades de formato ───────────────────────────────────────────────

  formatoTamano(bytes?: number): string {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  iconoArchivo(nombre?: string): string {
    const ext = (nombre ?? '').split('.').pop()?.toLowerCase() ?? '';
    if (['pdf'].includes(ext)) return 'picture_as_pdf';
    if (['doc', 'docx'].includes(ext)) return 'description';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'table_chart';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
    return 'insert_drive_file';
  }

  private mensajeError(e: any, porDefecto: string): string {
    return e?.error?.mensaje || e?.error?.message || porDefecto;
  }

  // ── F6: Responsables ──────────────────────────────────────────────────────

  cargarResponsables(): void {
    if (!this.politicaId) return;
    this.cargandoResponsables = true;
    this.documentoService.listarResponsables(this.politicaId).subscribe({
      next: (r) => { this.responsables = r ?? []; this.cargandoResponsables = false; },
      error: () => {
        this.cargandoResponsables = false;
        this.snackBar.open('No se pudieron cargar los responsables.', 'Cerrar', { duration: 3000 });
      },
    });
  }

  agregarResponsable(): void {
    if (!this.politicaId || !this.nuevoCorreo.trim()) return;
    this.documentoService.agregarResponsable(this.politicaId, this.nuevoCorreo.trim(), this.nuevoRol).subscribe({
      next: (r) => {
        this.responsables = r ?? [];
        this.nuevoCorreo = '';
        this.snackBar.open('Responsable guardado.', 'Cerrar', { duration: 2000 });
      },
      error: (e) => this.snackBar.open(this.mensajeError(e, 'No se pudo agregar el responsable.'), 'Cerrar', { duration: 3500 }),
    });
  }

  eliminarResponsable(r: Responsable): void {
    if (!this.politicaId) return;
    this.documentoService.eliminarResponsable(this.politicaId, r.usuarioId).subscribe({
      next: (lista) => {
        this.responsables = lista ?? [];
        this.snackBar.open('Responsable eliminado.', 'Cerrar', { duration: 2000 });
      },
      error: (e) => this.snackBar.open(this.mensajeError(e, 'No se pudo eliminar.'), 'Cerrar', { duration: 3500 }),
    });
  }

  // ── F6: Logs de auditoría ─────────────────────────────────────────────────

  cargarLogs(): void {
    if (!this.politicaId) return;
    this.cargandoLogs = true;
    this.documentoService.logsRepositorio(this.politicaId).subscribe({
      next: (l) => { this.logs = l ?? []; this.cargandoLogs = false; },
      error: () => {
        this.cargandoLogs = false;
        this.snackBar.open('No se pudieron cargar los logs.', 'Cerrar', { duration: 3000 });
      },
    });
  }

  etiquetaAccion(accion: AccionDocumento): string {
    const etiquetas: Record<AccionDocumento, string> = {
      VER: 'Vio', DESCARGAR: 'Descargó', CREAR: 'Creó', SUBIR_VERSION: 'Subió versión',
      RESTAURAR: 'Restauró', ELIMINAR: 'Archivó', COMENTAR: 'Comentó',
      BLOQUEAR: 'Bloqueó', DESBLOQUEAR: 'Desbloqueó', CAMBIAR_PERMISO: 'Cambió permiso',
      EDITAR_ONLINE: 'Abrió edición en línea', GUARDAR_ONLINE: 'Guardó (edición en línea)',
    };
    return etiquetas[accion] ?? accion;
  }

  iconoAccion(accion: AccionDocumento): string {
    const iconos: Record<AccionDocumento, string> = {
      VER: 'visibility', DESCARGAR: 'download', CREAR: 'add_circle', SUBIR_VERSION: 'upload',
      RESTAURAR: 'restore', ELIMINAR: 'archive', COMENTAR: 'comment',
      BLOQUEAR: 'lock', DESBLOQUEAR: 'lock_open', CAMBIAR_PERMISO: 'admin_panel_settings',
      EDITAR_ONLINE: 'edit_note', GUARDAR_ONLINE: 'cloud_done',
    };
    return iconos[accion] ?? 'history';
  }
}
