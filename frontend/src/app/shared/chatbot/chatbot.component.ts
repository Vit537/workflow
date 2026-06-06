import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ChatbotService, MensajeChat } from '../services/chatbot.service';
import { Usuario } from '../models/user.model';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss'],
  standalone: false,
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('scrollArea') scrollArea!: ElementRef<HTMLDivElement>;

  abierto = false;
  cargando = false;
  textoEntrada = '';
  historial: MensajeChat[] = [];
  usuario: Usuario | null = null;

  /** El asistente es solo para el back-office; nunca debe verse en el portal del cliente. */
  enRutaCliente = false;

  private sub!: Subscription;
  private subRuta!: Subscription;

  constructor(
    private authService: AuthService,
    private chatbotService: ChatbotService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.sub = this.authService.usuarioActual$.subscribe(u => {
      this.usuario = u;
      if (!u) {
        // Limpiar historial al cerrar sesión
        this.historial = [];
        this.abierto = false;
      }
    });

    // Ocultar el asistente cuando se navega dentro del portal del cliente (/cliente/*).
    this.enRutaCliente = this.esRutaCliente(this.router.url);
    this.subRuta = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.enRutaCliente = this.esRutaCliente(e.urlAfterRedirects);
        if (this.enRutaCliente) this.abierto = false;
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.subRuta?.unsubscribe();
  }

  private esRutaCliente(url: string): boolean {
    return url.startsWith('/cliente');
  }

  get visible(): boolean {
    return !this.enRutaCliente
      && !!this.usuario
      && (this.usuario.rol === 'ADMIN' || this.usuario.rol === 'ASESOR');
  }

  toggle(): void {
    this.abierto = !this.abierto;
    if (this.abierto && this.historial.length === 0) {
      const bienvenida =
        this.usuario?.rol === 'ADMIN'
          ? '¡Hola! Soy tu asistente del Workflow Engine. Puedo ayudarte con la gestión de políticas, usuarios, consultas, KPIs y reportes. ¿En qué puedo ayudarte?'
          : '¡Hola! Soy tu asistente del Workflow Engine. Puedo ayudarte con el Monitor de Actividades, la gestión de Consultas y las Políticas disponibles. ¿En qué puedo ayudarte?';
      this.historial.push({ rol: 'assistant', contenido: bienvenida });
    }
    if (this.abierto) {
      setTimeout(() => this.scrollAlFinal(), 50);
    }
  }

  enviar(): void {
    const texto = this.textoEntrada.trim();
    if (!texto || this.cargando || !this.usuario) return;

    this.historial.push({ rol: 'user', contenido: texto });
    this.textoEntrada = '';
    this.cargando = true;
    setTimeout(() => this.scrollAlFinal(), 30);

    // Mantenemos historial sin el mensaje recién agregado para el contexto
    const historialContexto = this.historial.slice(0, -1);

    this.chatbotService.enviarMensaje(historialContexto, texto, this.usuario.rol).subscribe({
      next: respuesta => {
        setTimeout(() => {
          this.historial.push({ rol: 'assistant', contenido: respuesta });
          this.cargando = false;
          this.scrollAlFinal();
        });
      },
      error: () => {
        setTimeout(() => {
          this.historial.push({
            rol: 'assistant',
            contenido: 'Lo siento, hubo un error al comunicarme con el asistente. Inténtalo de nuevo.',
          });
          this.cargando = false;
          this.scrollAlFinal();
        });
      },
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviar();
    }
  }

  limpiar(): void {
    this.historial = [];
    const bienvenida =
      this.usuario?.rol === 'ADMIN'
        ? '¡Hola! Soy tu asistente del Workflow Engine. Puedo ayudarte con la gestión de políticas, usuarios, consultas, KPIs y reportes. ¿En qué puedo ayudarte?'
        : '¡Hola! Soy tu asistente del Workflow Engine. Puedo ayudarte con el Monitor de Actividades, la gestión de Consultas y las Políticas disponibles. ¿En qué puedo ayudarte?';
    this.historial.push({ rol: 'assistant', contenido: bienvenida });
  }

  private scrollAlFinal(): void {
    if (this.scrollArea?.nativeElement) {
      this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight;
    }
  }
}
