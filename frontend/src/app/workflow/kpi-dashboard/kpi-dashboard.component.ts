import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of, switchMap } from 'rxjs';
import { KpiService, RespuestaKpi, KpiNodo } from '../../shared/services/kpi.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-kpi-dashboard',
  templateUrl: './kpi-dashboard.component.html',
  styleUrls: ['./kpi-dashboard.component.scss'],
  standalone: false,
})
export class KpiDashboardComponent implements OnInit {
  private recarga$ = new BehaviorSubject<void>(undefined);
  kpi$!: Observable<RespuestaKpi | null>;
  columnas = ['etiqueta', 'carril', 'completados', 'pendientes', 'tiempo', 'barra'];

  constructor(
    private kpiService: KpiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.kpi$ = this.recarga$.pipe(
      switchMap(() =>
        this.kpiService.obtenerKpis().pipe(
          catchError(() => {
            this.snackBar.open('Error al cargar los KPIs', 'Cerrar', { duration: 3000 });
            return of(null);
          })
        )
      )
    );
  }

  cargar(): void {
    this.recarga$.next();
  }

  contarCuellos(kpi: RespuestaKpi | null): number {
    return kpi?.kpiPorNodo.filter((n: KpiNodo) => n.cuelloDeBotella).length ?? 0;
  }

  promedioGeneral(kpi: RespuestaKpi | null): number {
    if (!kpi?.kpiPorNodo?.length) return 0;
    const nodos = kpi.kpiPorNodo.filter(n => n.tiempoPromedioSegundos > 0);
    if (!nodos.length) return 0;
    return nodos.reduce((sum, n) => sum + n.tiempoPromedioSegundos, 0) / nodos.length;
  }

  maxTiempo(kpi: RespuestaKpi | null): number {
    if (!kpi?.kpiPorNodo?.length) return 1;
    return Math.max(...kpi.kpiPorNodo.map(n => n.tiempoPromedioSegundos), 1);
  }

  porcentajeBarra(segundos: number, max: number): number {
    if (max <= 0) return 0;
    return Math.min(Math.round((segundos / max) * 100), 100);
  }

  formatearTiempo(segundos: number): string {
    if (segundos <= 0) return '—';
    if (segundos < 60) return `${Math.round(segundos)}s`;
    const minutos = Math.floor(segundos / 60);
    const segs = Math.round(segundos % 60);
    if (minutos < 60) return `${minutos}m ${segs}s`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }
}
