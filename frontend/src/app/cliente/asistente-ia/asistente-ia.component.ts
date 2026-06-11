import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AgenteIaService,
  MensajeAgente,
  RecomendacionPolitica,
} from '../../shared/services/agente-ia.service';
import { ClienteConsultaService } from '../../shared/services/cliente-consulta.service';

interface Burbuja {
  role: 'user' | 'assistant';
  texto: string;
  recomendacion?: RecomendacionPolitica | null;
  sugiereAsesor?: boolean;
}

@Component({
  selector: 'app-asistente-ia',
  templateUrl: './asistente-ia.component.html',
  styleUrls: ['./asistente-ia.component.scss'],
  standalone: false,
})
export class AsistenteIaComponent {
  mensajes: Burbuja[] = [
    {
      role: 'assistant',
      texto: 'Hola, soy el asistente virtual. Cuéntame qué necesitas y te recomendaré el trámite adecuado. Si lo prefieres, también puedes hablar con un asesor. Aquí tienes algunos ejemplos de lo que puedes pedirme:',
    },
  ];
  // Ejemplos sugeridos para guiar al cliente (rellenan el input al hacer click).
  ejemplos: string[] = [
    'Quiero abrir una cuenta de ahorros',
    'Necesito solicitar un préstamo',
    'Tengo un cobro que no reconozco en mi tarjeta',
    'Quiero contratar un seguro',
  ];
  entrada = '';
  cargando = false;
  derivando = false;

  // ── Voz ──
  grabando = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  constructor(
    private agente: AgenteIaService,
    private consultas: ClienteConsultaService,
    private router: Router,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  usarEjemplo(ej: string): void {
    this.entrada = ej;
    this.enviar();
  }

  enviar(): void {
    const texto = this.entrada.trim();
    if (!texto || this.cargando) return;

    // Historial = turnos previos (sin el mensaje actual; el backend lo agrega aparte).
    const historial: MensajeAgente[] = this.mensajes
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.texto }));

    this.mensajes.push({ role: 'user', texto });
    this.entrada = '';
    this.cargando = true;

    this.agente.consultar(texto, historial).subscribe({
      next: (r) => {
        this.mensajes.push({
          role: 'assistant',
          texto: r.respuesta,
          recomendacion: r.recomendacion,
          sugiereAsesor: r.sugiereAsesor,
        });
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensajes.push({
          role: 'assistant',
          texto: 'Ocurrió un error al procesar tu consulta. Puedes intentar de nuevo o solicitar un asesor.',
          sugiereAsesor: true,
        });
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Voz: grabar / detener ───────────────────────────────────────────────
  async iniciarGrabacion(): Promise<void> {
    if (this.grabando || this.cargando) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.audioChunks.push(e.data); };
      this.mediaRecorder.onstop = () => this.procesarAudio(stream);
      this.mediaRecorder.start();
      this.grabando = true;
    } catch {
      this.mensajes.push({ role: 'assistant', texto: 'No pude acceder al micrófono. Revisa los permisos del navegador.' });
      this.cdr.detectChanges();
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
      this.mensajes.push({ role: 'assistant', texto: 'El audio fue muy corto. Intenta de nuevo.' });
      this.cdr.detectChanges();
      return;
    }
    const historial = this.mensajes
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.texto }));
    this.cargando = true;
    this.cdr.detectChanges();
    this.agente.consultarAudio(blob, historial).subscribe({
      next: (r) => {
        if (r.promptTranscrito) this.mensajes.push({ role: 'user', texto: r.promptTranscrito });
        this.mensajes.push({ role: 'assistant', texto: r.respuesta, recomendacion: r.recomendacion, sugiereAsesor: r.sugiereAsesor });
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensajes.push({ role: 'assistant', texto: 'No se pudo procesar el audio. Intenta de nuevo o escribe tu consulta.', sugiereAsesor: true });
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  derivarAsesor(): void {
    if (this.derivando) return;
    const consultaTexto =
      this.mensajes.filter((m) => m.role === 'user').map((m) => m.texto).join(' | ') ||
      'Consulta iniciada desde el asistente IA';
    this.derivando = true;
    this.consultas.crearConsulta(consultaTexto).subscribe({
      next: () => {
        this.derivando = false;
        this.snack.open('Te derivamos con un asesor. Verás la consulta en tu lista.', 'Cerrar', { duration: 3500 });
        this.router.navigate(['/cliente/consultas']);
      },
      error: () => {
        this.derivando = false;
        this.snack.open('No se pudo crear la consulta con el asesor.', 'Cerrar', { duration: 3000 });
        this.cdr.detectChanges();
      },
    });
  }
}
