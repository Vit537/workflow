import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-panel-publicar',
  templateUrl: './panel-publicar.component.html',
  styleUrls: ['./panel-publicar.component.scss'],
  standalone: false,
})
export class PanelPublicarComponent {
  @Input() abierto = false;
  @Input() errores: string[] = [];
  @Input() advertencias: string[] = [];
  @Input() valido = false;

  @Output() cerrado = new EventEmitter<void>();
  @Output() confirmarPublicar = new EventEmitter<void>();
}
