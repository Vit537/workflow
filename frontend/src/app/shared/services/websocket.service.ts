import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {
  private cliente!: Client;
  private conectado = false;

  constructor(private authService: AuthService, private zone: NgZone) {}

  conectar(): void {
    if (this.conectado) return;

    this.cliente = new Client({
      webSocketFactory: () => new SockJS(`${environment.wsUrl}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${this.authService.obtenerToken() ?? ''}`,
      },
      reconnectDelay: 5000,
    });

    this.cliente.onConnect = () => {
      this.conectado = true;
    };

    this.cliente.activate();
  }

  desconectar(): void {
    if (this.cliente && this.conectado) {
      this.cliente.deactivate();
      this.conectado = false;
    }
  }

  suscribir<T>(destino: string): Observable<T> {
    const subject = new Subject<T>();
    // Run the polling loop outside Angular's zone so the 200ms timer
    // doesn't trigger unnecessary change-detection cycles.
    this.zone.runOutsideAngular(() => {
      const esperarConexion = () => {
        if (this.cliente?.connected) {
          this.cliente.subscribe(destino, (msg: IMessage) => {
            // Re-enter the zone when emitting so subscribers see the update.
            this.zone.run(() => subject.next(JSON.parse(msg.body) as T));
          });
        } else {
          setTimeout(esperarConexion, 200);
        }
      };
      esperarConexion();
    });
    return subject.asObservable();
  }

  publicar(destino: string, cuerpo: object): void {
    if (this.cliente?.connected) {
      this.cliente.publish({ destination: destino, body: JSON.stringify(cuerpo) });
    }
  }

  ngOnDestroy(): void {
    this.desconectar();
  }
}
