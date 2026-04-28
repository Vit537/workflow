import { ChangeDetectorRef, Component, NgZone, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, catchError, of, switchMap } from 'rxjs';
import { TramiteService, RespuestaTramite, EstadoPaso } from '../../shared/services/tramite.service';
import { WebsocketService } from '../../shared/services/websocket.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-monitor-actividades',
  templateUrl: './monitor-actividades.component.html',
  styleUrls: ['./monitor-actividades.component.scss'],
  standalone: false,
})
export class MonitorActividadesComponent implements OnInit, OnDestroy {
  private recarga$ = new BehaviorSubject<void>(undefined);
  tramites$!: Observable<RespuestaTramite[]>;
  private suscripcion?: Subscription;

  /** Mapa tramiteId+nodoId → true mientras hay una petición en curso */
  cambiando: Record<string, boolean> = {};

  constructor(
    private tramiteService: TramiteService,
    private wsService: WebsocketService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.tramites$ = this.recarga$.pipe(
      switchMap(() =>
        this.tramiteService.misActividades().pipe(
          catchError(() => of([]))
        )
      )
    );

    this.wsService.conectar();
    this.suscripcion = this.wsService
      .suscribir<RespuestaTramite>('/topic/actividades')
      .subscribe(() => this.recarga$.next());
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.wsService.desconectar();
  }

  cambiarEstado(
    tramiteId: string,
    nodoId: string,
    estado: 'PENDIENTE' | 'EN_PROGRESO' | 'BLOQUEADO'
  ): void {
    const key = tramiteId + nodoId;
    this.cambiando[key] = true;
    this.tramiteService.cambiarEstadoPaso(tramiteId, nodoId, estado).subscribe({
      next: () => {
        // setTimeout defers mutations to the next macrotask so Angular's
        // dev-mode double-check does not see a mid-cycle value change (NG0100)
        setTimeout(() => {
          this.cambiando[key] = false;
          this.recarga$.next();
          const etiquetas: Record<string, string> = {
            PENDIENTE: 'Pendiente',
            EN_PROGRESO: 'En progreso',
            BLOQUEADO: 'Bloqueado',
          };
          this.snackBar.open(`Paso marcado como ${etiquetas[estado]}`, 'OK', { duration: 2500 });
        });
      },
      error: (err) => {
        setTimeout(() => {
          this.cambiando[key] = false;
          this.snackBar.open(err?.error?.mensaje ?? 'Error al cambiar estado', 'Cerrar', { duration: 3000 });
        });
      },
    });
  }

  colorEstadoPaso(estado: string): string {
    const mapa: Record<string, string> = {
      PENDIENTE: 'warn',
      EN_PROGRESO: 'accent',
      COMPLETADO: 'primary',
      BLOQUEADO: '',
    };
    return mapa[estado] ?? '';
  }

  icono(estado: string): string {
    const mapa: Record<string, string> = {
      PENDIENTE: 'schedule',
      EN_PROGRESO: 'hourglass_bottom',
      COMPLETADO: 'check_circle',
      BLOQUEADO: 'block',
    };
    return mapa[estado] ?? 'help_outline';
  }

  abrirActividad(tramiteId: string, nodoId: string, tramite?: RespuestaTramite): void {
    this.router.navigate(
      ['/workflow/tramites', tramiteId, 'pasos', nodoId],
      { state: { tramite } }
    );
  }
}
