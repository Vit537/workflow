import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ClienteAuthService } from '../../shared/services/cliente-auth.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { WebsocketService } from '../../shared/services/websocket.service';
import { Notificacion } from '../../shared/models/cliente.model';

@Component({
  selector: 'app-cliente-shell',
  templateUrl: './cliente-shell.component.html',
  styleUrls: ['./cliente-shell.component.scss'],
  standalone: false,
})
export class ClienteShellComponent implements OnInit, OnDestroy {
  nombre = '';
  noLeidas = 0;
  private sub?: Subscription;

  constructor(
    private auth: ClienteAuthService,
    private router: Router,
    private notificaciones: NotificacionService,
    private ws: WebsocketService,
  ) {}

  ngOnInit(): void {
    this.nombre = this.auth.obtenerUsuarioActual()?.nombre ?? 'Cliente';
    this.refrescarNoLeidas();

    const id = this.auth.obtenerUsuarioActual()?.id;
    if (id) {
      this.ws.conectar();
      this.sub = this.ws.suscribir<Notificacion>(`/topic/usuarios/${id}/notificaciones`)
        .subscribe(() => this.noLeidas++);
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  refrescarNoLeidas(): void {
    this.notificaciones.listar().subscribe({
      next: (lista) => { this.noLeidas = lista.filter(n => !n.leida).length; },
      error: () => {},
    });
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/cliente/login']);
  }
}
