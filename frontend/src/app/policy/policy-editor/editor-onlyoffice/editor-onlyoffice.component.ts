import {
  Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges, HostListener,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocumentoService } from '../../../shared/services/documento.service';
import { OnlyOfficeLoaderService } from '../../../shared/services/onlyoffice-loader.service';

/**
 * Editor de co-edición en vivo (OnlyOffice) embebido como modal grande.
 *
 * <p>Al abrirse pide la config firmada al backend, carga el api.js del Document Server e instancia
 * `DocsAPI.DocEditor`. La co-edición simultánea y la presencia las maneja OnlyOffice dentro del iframe;
 * al cerrar, el backend ya habrá guardado una versión nueva (vía callback) y el repositorio se refresca.</p>
 */
@Component({
  selector: 'app-editor-onlyoffice',
  templateUrl: './editor-onlyoffice.component.html',
  styleUrls: ['./editor-onlyoffice.component.scss'],
  standalone: false,
})
export class EditorOnlyOfficeComponent implements OnChanges, OnDestroy {
  @Input() abierto = false;
  @Input() documentoId: string | null = null;
  @Input() titulo = '';
  @Output() cerrado = new EventEmitter<void>();

  /** Id del div donde OnlyOffice monta el editor. */
  readonly contenedorId = 'onlyoffice-editor-container';

  cargando = false;
  error: string | null = null;
  soloLectura = false;

  private editor: any = null;

  constructor(
    private documentoService: DocumentoService,
    private loader: OnlyOfficeLoaderService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['abierto']) {
      if (this.abierto && this.documentoId) {
        // Esperar a que el div del template esté en el DOM.
        setTimeout(() => this.iniciar(), 0);
      } else if (!this.abierto) {
        this.destruir();
      }
    }
  }

  ngOnDestroy(): void {
    this.destruir();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto) this.cerrar();
  }

  private iniciar(): void {
    if (!this.documentoId) return;
    this.error = null;
    this.cargando = true;

    this.documentoService.configOnlyOffice(this.documentoId).subscribe({
      next: (resp) => {
        this.soloLectura = !resp.editable;
        this.loader.cargarApi(resp.publicUrl)
          .then(() => this.montarEditor(resp.config))
          .catch((e) => this.fallar(e?.message || 'No se pudo cargar el editor en línea.'));
      },
      error: (e) => this.fallar(this.mensajeError(e, 'No se pudo abrir el editor en línea.')),
    });
  }

  private montarEditor(config: any): void {
    try {
      this.destruirEditor();
      const conEventos = {
        ...config,
        width: '100%',
        height: '100%',
        events: {
          onError: (ev: any) => this.fallar('Error del editor en línea: ' + (ev?.data ?? '')),
        },
      };
      this.editor = new window.DocsAPI.DocEditor(this.contenedorId, conEventos);
      this.cargando = false;
    } catch (e: any) {
      this.fallar(e?.message || 'No se pudo iniciar el editor en línea.');
    }
  }

  private fallar(mensaje: string): void {
    this.cargando = false;
    this.error = mensaje;
    this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
  }

  cerrar(): void {
    this.destruir();
    this.cerrado.emit();
  }

  private destruir(): void {
    this.destruirEditor();
    this.cargando = false;
    this.error = null;
  }

  private destruirEditor(): void {
    if (this.editor) {
      try { this.editor.destroyEditor(); } catch { /* ignorar */ }
      this.editor = null;
    }
  }

  private mensajeError(e: any, porDefecto: string): string {
    return e?.error?.mensaje || e?.error?.message || porDefecto;
  }
}
