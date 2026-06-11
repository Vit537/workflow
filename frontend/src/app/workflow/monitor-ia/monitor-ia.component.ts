import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RiesgoService, PanelRiesgo, PanelItem, EstadoEntrenamiento } from '../../shared/services/riesgo.service';

@Component({
  selector: 'app-monitor-ia',
  templateUrl: './monitor-ia.component.html',
  styleUrls: ['./monitor-ia.component.scss'],
  standalone: false,
})
export class MonitorIaComponent implements OnInit, OnDestroy {
  cargando = false;
  error = '';
  panel: PanelRiesgo | null = null;

  // Entrenamiento
  entrenamiento: EstadoEntrenamiento | null = null;
  private pollId: any = null;

  constructor(private riesgo: RiesgoService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargar();
    this.refrescarEstadoEntrenamiento();
  }

  ngOnDestroy(): void {
    if (this.pollId) clearInterval(this.pollId);
  }

  get entrenando(): boolean {
    return this.entrenamiento?.estado === 'ENTRENANDO';
  }

  refrescarEstadoEntrenamiento(): void {
    this.riesgo.estadoEntrenamiento().subscribe({
      next: (e) => {
        this.entrenamiento = e;
        if (e.estado === 'ENTRENANDO' && !this.pollId) this.iniciarPolling();
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  entrenarModelos(): void {
    if (this.entrenando) return;
    this.riesgo.entrenar().subscribe({
      next: (e) => {
        this.entrenamiento = e;
        this.iniciarPolling();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.entrenamiento = { estado: 'ERROR', mensaje: err?.error?.message ?? 'No se pudo iniciar el entrenamiento.' };
        this.cdr.detectChanges();
      },
    });
  }

  private iniciarPolling(): void {
    if (this.pollId) clearInterval(this.pollId);
    this.pollId = setInterval(() => {
      this.riesgo.estadoEntrenamiento().subscribe({
        next: (e) => {
          this.entrenamiento = e;
          if (e.estado !== 'ENTRENANDO') {
            clearInterval(this.pollId);
            this.pollId = null;
            if (e.estado === 'OK') this.cargar(); // refrescar predicciones con el modelo nuevo
          }
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    }, 3000);
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.riesgo.panel().subscribe({
      next: (p) => {
        this.panel = p;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.error = e?.error?.message ?? 'No se pudo cargar el panel. Verifica que el microservicio de IA esté activo.';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get anomalias(): PanelItem[] {
    return this.panel?.items.filter((i) => i.esAnomalia) ?? [];
  }

  get fuente(): string {
    return this.panel?.items?.[0]?.fuente ?? '—';
  }

  claseNivel(n: string): string {
    return n === 'ALTA' || n === 'ALTO' ? 'alta' : n === 'MEDIA' || n === 'MEDIO' ? 'media' : 'baja';
  }
}
