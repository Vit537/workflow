import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IaService, DiagramaIA, AccionIA } from '../../../shared/services/ia.service';
import { Politica } from '../../../shared/models/policy.model';

@Component({
  selector: 'app-panel-ia',
  templateUrl: './panel-ia.component.html',
  styleUrls: ['./panel-ia.component.scss'],
  standalone: false,
})
export class PanelIaComponent {
  @Input() abierto = false;
  @Input() politica: Politica | null = null;

  @Output() cerrado = new EventEmitter<void>();
  @Output() diagramaCreado = new EventEmitter<DiagramaIA>();
  @Output() accionesAplicar = new EventEmitter<AccionIA[]>();

  promptIA = '';
  generandoIA = false;
  descripcionIA = '';

  grabandoVoz = false;
  private reconocimientoVoz: any = null;

  constructor(
    private iaService: IaService,
    private snackBar: MatSnackBar,
  ) {}

  // ── CU-08: Generar diagrama con IA ────────────────────────────────────

  generarDiagramaConIA(): void {
    if (!this.promptIA.trim()) return;
    this.generandoIA = true;
    this.descripcionIA = '';

    const diagramaActual = this.politica && (this.politica.nodos?.length || this.politica.carriles?.length)
      ? { carriles: this.politica.carriles ?? [], nodos: this.politica.nodos ?? [], conexiones: this.politica.conexiones ?? [] } as DiagramaIA
      : null;

    this.iaService.generarDiagrama(this.promptIA, diagramaActual).subscribe({
      next: (resp) => {
        this.descripcionIA = resp.descripcion;
        this.generandoIA = false;

        if (resp.modo === 'EDITAR' && resp.acciones?.length) {
          this.accionesAplicar.emit(resp.acciones);
          this.snackBar.open(`IA aplicó ${resp.acciones.length} cambio(s)`, 'Cerrar', { duration: 3000 });
        } else if (resp.modo === 'CREAR' && resp.diagrama) {
          this.diagramaCreado.emit(resp.diagrama);
          this.snackBar.open('Diagrama generado por IA', 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open('La IA no devolvió cambios', 'Cerrar', { duration: 3000 });
        }
      },
      error: () => {
        this.generandoIA = false;
        this.snackBar.open('Error al conectar con el servicio IA', 'Cerrar', { duration: 4000 });
      },
    });
  }

  // ── CU-09: Voz ─────────────────────────────────────────────────────────

  get soportaVoz(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  iniciarGrabacionVoz(): void {
    if (!this.soportaVoz) {
      this.snackBar.open('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.', 'Cerrar', { duration: 4000 });
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.reconocimientoVoz = new SpeechRecognition();
    this.reconocimientoVoz.lang = 'es-ES';
    this.reconocimientoVoz.continuous = false;
    this.reconocimientoVoz.interimResults = false;

    this.reconocimientoVoz.onstart = () => { this.grabandoVoz = true; };
    this.reconocimientoVoz.onend = () => { this.grabandoVoz = false; };
    this.reconocimientoVoz.onerror = (evt: any) => {
      this.grabandoVoz = false;
      this.snackBar.open(`Error de voz: ${evt.error}`, 'Cerrar', { duration: 4000 });
    };
    this.reconocimientoVoz.onresult = (evt: any) => {
      const transcripcion: string = evt.results[0][0].transcript;
      this.promptIA = transcripcion;
      this.snackBar.open(`Transcripción: "${transcripcion}"`, 'Cerrar', { duration: 3000 });
    };

    this.reconocimientoVoz.start();
  }

  detenerGrabacionVoz(): void {
    if (this.reconocimientoVoz) {
      this.reconocimientoVoz.stop();
    }
  }
}
