import { Component, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ReporteService, ResultadoReporte } from '../../shared/services/reporte.service';

@Component({
  selector: 'app-reporte-dinamico',
  templateUrl: './reporte-dinamico.component.html',
  styleUrls: ['./reporte-dinamico.component.scss'],
  standalone: false,
})
export class ReporteDinamicoComponent implements OnDestroy {
  // ── Estado ──
  prompt = '';
  cargando = false;
  error = '';
  reporte: ResultadoReporte | null = null;

  // Ejemplos de KPI (métricas agregadas → muestran texto de interpretación)
  ejemplosKPI: string[] = [
    'Cantidad de trámites por estado',
    'Tiempo promedio en horas para completar cada trámite',
    'Tasa de trámites completados vs cancelados',
    'Top 5 asesores por cantidad de trámites atendidos',
    'Promedio de duración por paso o actividad',
  ];
  // Ejemplos de reporte normal (listados)
  ejemplosListado: string[] = [
    'Lista de trámites activos',
    'Usuarios asesores activos',
  ];
  mostrarAyuda = false;

  // ── Audio ──
  grabando = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  audioBloqueado = false;

  constructor(
    private reporteService: ReporteService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  // ── Ejemplos ──────────────────────────────────────────────────────────────

  usarEjemplo(texto: string): void {
    this.prompt = texto;
    this.generarDesdeTexto();
  }

  // ── Generar desde texto ───────────────────────────────────────────────────

  generarDesdeTexto(): void {
    if (!this.prompt.trim()) return;
    console.log('[Reporte] Iniciando generación para prompt:', this.prompt.trim());
    this.iniciarCarga();
    this.reporteService.generarDesdeTexto(this.prompt.trim()).pipe(timeout(95_000)).subscribe({
      next: (r) => this.ngZone.run(() => { console.log('[Reporte] Respuesta recibida:', r); this.manejarExito(r); }),
      error: (e) => this.ngZone.run(() => { console.error('[Reporte] Error recibido:', e); this.manejarError(e); }),
    });
    console.log('[Reporte] Suscripción creada, cargando=', this.cargando);
  }

  // ── Audio: grabar / detener ───────────────────────────────────────────────

  async iniciarGrabacion(): Promise<void> {
    if (this.grabando || this.audioBloqueado) return;
    this.error = '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => this.procesarAudio(stream);
      this.mediaRecorder.start();
      this.grabando = true;
    } catch {
      this.error = 'No se pudo acceder al micrófono. Verifica los permisos del navegador.';
    }
  }

  detenerGrabacion(): void {
    if (!this.grabando || !this.mediaRecorder) return;
    this.mediaRecorder.stop();
    this.grabando = false;
  }

  private procesarAudio(stream: MediaStream): void {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
    if (blob.size < 1000) {
      this.error = 'El audio grabado es demasiado corto. Intenta de nuevo.';
      return;
    }
    this.audioBloqueado = true;
    this.iniciarCarga();
    this.reporteService.generarDesdeAudio(blob, 'reporte.webm').pipe(timeout(120_000)).subscribe({
      next: (r) => { this.manejarExito(r); this.audioBloqueado = false; },
      error: (e) => { this.manejarError(e); this.audioBloqueado = false; },
    });
  }

  // ── Exportar Excel ────────────────────────────────────────────────────────

  exportarExcel(): void {
    if (!this.reporte) return;
    this.reporteService.exportarExcel(this.reporte).subscribe({
      next: (blob) => this.descargar(blob, `reporte_${Date.now()}.xlsx`),
      error: () => { this.error = 'Error al exportar el archivo Excel.'; },
    });
  }

  exportarPdf(): void {
    if (!this.reporte) return;
    this.reporteService.exportarPdf(this.reporte).subscribe({
      next: (blob) => this.descargar(blob, `reporte_${Date.now()}.pdf`),
      error: () => { this.error = 'Error al exportar el archivo PDF.'; },
    });
  }

  private descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private iniciarCarga(): void {
    this.cargando = true;
    this.error = '';
    this.reporte = null;
  }

  private manejarExito(r: ResultadoReporte): void {
    this.reporte = r;
    if (r.promptTranscrito) this.prompt = r.promptTranscrito;
    this.cargando = false;
    this.cdr.detectChanges();
  }

  private manejarError(e: any): void {
    if (e instanceof TimeoutError) {
      this.error = 'La generación del reporte tardó demasiado. El modelo de IA puede estar ocupado. Intenta de nuevo.';
    } else {
      this.error = e?.error?.detail ?? e?.error?.message ?? e?.error?.mensaje ?? 'Error al generar el reporte. Intenta de nuevo.';
    }
    this.cargando = false;
    this.cdr.detectChanges();
  }

  formatearValor(val: any): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  limpiar(): void {
    this.reporte = null;
    this.prompt = '';
    this.error = '';
  }

  ngOnDestroy(): void {
    if (this.grabando) this.detenerGrabacion();
  }
}
