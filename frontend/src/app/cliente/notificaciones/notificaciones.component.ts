import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { Notificacion, TipoNotificacion } from '../../shared/models/cliente.model';

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.scss'],
  standalone: false,
})
export class NotificacionesComponent implements OnInit {
  notificaciones: Notificacion[] = [];
  cargando = false;

  constructor(
    private servicio: NotificacionService,
    private router: Router,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.servicio.listar().pipe(
      finalize(() => { this.cargando = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: (n) => { this.notificaciones = n; },
      error: () => {},
    });
  }

  abrir(n: Notificacion): void {
    if (!n.leida) {
      this.servicio.marcarLeida(n.id).subscribe({ next: () => n.leida = true });
    }
    if (n.referenciaId) {
      this.router.navigate(['/cliente/consultas', n.referenciaId]);
    }
  }

  marcarTodas(): void {
    this.servicio.marcarTodasLeidas().subscribe({
      next: () => this.notificaciones.forEach(n => n.leida = true),
    });
  }

  eliminar(n: Notificacion, ev: Event): void {
    ev.stopPropagation();
    this.servicio.eliminar(n.id).subscribe({
      next: () => {
        this.notificaciones = this.notificaciones.filter(x => x.id !== n.id);
        this.snack.open('Notificación eliminada.', 'Cerrar', { duration: 1500 });
      },
    });
  }

  get hayNoLeidas(): boolean { return this.notificaciones.some(n => !n.leida); }

  icono(tipo: TipoNotificacion): string {
    const m: Record<TipoNotificacion, string> = {
      CONSULTA_ATENDIDA: 'support_agent', NUEVO_MENSAJE: 'chat', PASO_AVANZADO: 'account_tree',
      CONSULTA_COMPLETADA: 'task_alt', GENERAL: 'notifications',
    };
    return m[tipo] ?? 'notifications';
  }
}
