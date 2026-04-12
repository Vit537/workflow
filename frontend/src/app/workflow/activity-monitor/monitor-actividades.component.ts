import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TramiteService, RespuestaTramite } from '../../shared/services/tramite.service';
import { WebsocketService } from '../../shared/services/websocket.service';

@Component({
  selector: 'app-monitor-actividades',
  templateUrl: './monitor-actividades.component.html',
  styleUrls: ['./monitor-actividades.component.scss'],
  standalone: false,
})
export class MonitorActividadesComponent implements OnInit, OnDestroy {
  tramites: RespuestaTramite[] = [];
  cargando = true;
  private suscripcion?: Subscription;

  constructor(
    private tramiteService: TramiteService,
    private wsService: WebsocketService
  ) {}

  ngOnInit(): void {
    this.cargarActividades();
    this.wsService.conectar();

    // CU-12: escuchar nuevas actividades en tiempo real
    this.suscripcion = this.wsService
      .suscribir<RespuestaTramite>('/topic/actividades')
      .subscribe((tramite) => {
        const indice = this.tramites.findIndex(t => t.id === tramite.id);
        if (indice >= 0) {
          this.tramites[indice] = tramite;
        } else {
          this.tramites = [tramite, ...this.tramites];
        }
      });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.wsService.desconectar();
  }

  cargarActividades(): void {
    this.cargando = true;
    this.tramiteService.misActividades().subscribe({
      next: (lista) => {
        this.tramites = lista;
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
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
}
