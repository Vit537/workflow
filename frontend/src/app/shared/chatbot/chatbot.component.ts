import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
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

  private sub!: Subscription;

  constructor(
    private authService: AuthService,
    private chatbotService: ChatbotService,
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
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get visible(): boolean {
    return !!this.usuario && (this.usuario.rol === 'ADMIN' || this.usuario.rol === 'ASESOR');
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
