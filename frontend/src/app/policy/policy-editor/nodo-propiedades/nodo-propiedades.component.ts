import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  HostBinding,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Nodo,
  TipoFlujo,
  TipoCampo,
  CampoFormulario,
} from '../../../shared/models/policy.model';

@Component({
  selector: 'app-nodo-propiedades',
  templateUrl: './nodo-propiedades.component.html',
  styleUrls: ['./nodo-propiedades.component.scss'],
  standalone: false,
})
export class NodoPropiedadesComponent implements OnChanges {
  @Input() nodo: Nodo | null = null;
  @Input() politicaEstado = 'BORRADOR';

  @Output() autoGuardar = new EventEmitter<void>();
  @Output() cerrado = new EventEmitter<void>();

  @HostBinding('class.panel-visible') get isVisible() { return !!this.nodo; }

  tabActiva = 0;
  formularioFlujo!: FormGroup;
  formularioFormulario!: FormGroup;
  formularioCampo!: FormGroup;

  readonly opcionesFlujo: { valor: TipoFlujo; etiqueta: string; descripcion: string }[] = [
    { valor: 'LINEAL',      etiqueta: 'Lineal',      descripcion: 'El flujo continúa directamente al siguiente nodo.' },
    { valor: 'CONDICIONAL', etiqueta: 'Condicional', descripcion: 'El flujo se bifurca; define condiciones para cada rama.' },
    { valor: 'ITERATIVO',   etiqueta: 'Iterativo',   descripcion: 'El flujo puede regresar hasta que se cumpla la condición de salida.' },
    { valor: 'PARALELO',    etiqueta: 'Paralelo',    descripcion: 'Dos o más nodos se activan simultáneamente.' },
  ];

  readonly tiposCampo: { valor: TipoCampo; etiqueta: string }[] = [
    { valor: 'TEXTO',     etiqueta: 'Texto' },
    { valor: 'NUMERO',    etiqueta: 'Número' },
    { valor: 'FECHA',     etiqueta: 'Fecha' },
    { valor: 'BOOLEANO',  etiqueta: 'Sí / No' },
    { valor: 'ARCHIVO',   etiqueta: 'Archivo' },
    { valor: 'SELECCION', etiqueta: 'Selección' },
  ];

  constructor(private fb: FormBuilder, private snackBar: MatSnackBar) {
    this.formularioFlujo = this.fb.group({
      tipoFlujo: ['LINEAL', Validators.required],
      nuevaCondicion: [''],
    });

    this.formularioFormulario = this.fb.group({
      titulo: ['', Validators.required],
      instrucciones: [''],
      nuevoRequisito: [''],
    });

    this.formularioCampo = this.fb.group({
      nombre: ['', Validators.required],
      etiqueta: ['', Validators.required],
      tipoCampo: ['TEXTO', Validators.required],
      requerido: [false],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodo']) {
      if (this.nodo) {
        this.formularioFlujo.patchValue({
          tipoFlujo: this.nodo.tipoFlujo ?? 'LINEAL',
          nuevaCondicion: '',
        });
        this.formularioFormulario.patchValue({
          titulo: this.nodo.formulario?.titulo ?? '',
          instrucciones: this.nodo.formulario?.instrucciones ?? '',
          nuevoRequisito: '',
        });
        this.formularioCampo.reset({ tipoCampo: 'TEXTO', requerido: false });
        this.tabActiva = 0;
      }
    }
  }

  // ── CU-05: Tipo de flujo ───────────────────────────────────────────────

  guardarTipoFlujo(): void {
    if (!this.nodo || this.formularioFlujo.invalid) return;
    const tipoFlujo = this.formularioFlujo.value.tipoFlujo;

    if (tipoFlujo === 'CONDICIONAL') {
      const condiciones = this.nodo.condiciones ?? [];
      if (condiciones.length < 2) {
        this.snackBar.open(
          'Un nodo CONDICIONAL requiere al menos 2 condiciones de ramificación.',
          'Cerrar',
          { duration: 3500 }
        );
        return;
      }
    }

    this.nodo.tipoFlujo = tipoFlujo;
    this.autoGuardar.emit();
    this.snackBar.open('Tipo de flujo aplicado y guardando...', 'Cerrar', { duration: 2000 });
  }

  agregarCondicion(): void {
    if (!this.nodo) return;
    const valor: string = (this.formularioFlujo.value.nuevaCondicion ?? '').trim();
    if (!valor) return;
    if (!this.nodo.condiciones) this.nodo.condiciones = [];
    this.nodo.condiciones.push(valor);
    this.formularioFlujo.patchValue({ nuevaCondicion: '' });
  }

  eliminarCondicion(indice: number): void {
    this.nodo?.condiciones?.splice(indice, 1);
  }

  // ── CU-06: Formulario del nodo ─────────────────────────────────────────

  get requisitosNodo(): string[] {
    return this.nodo?.formulario?.requisitos ?? [];
  }

  get camposNodo(): CampoFormulario[] {
    return this.nodo?.formulario?.campos ?? [];
  }

  guardarEncabezadoFormulario(): void {
    if (!this.nodo || this.formularioFormulario.invalid) return;
    this.asegurarFormulario();
    this.nodo.formulario!.titulo = this.formularioFormulario.value.titulo;
    this.nodo.formulario!.instrucciones = this.formularioFormulario.value.instrucciones ?? '';
    this.autoGuardar.emit();
    this.snackBar.open('Encabezado guardado.', 'Cerrar', { duration: 2000 });
  }

  agregarRequisito(): void {
    if (!this.nodo) return;
    const valor: string = (this.formularioFormulario.value.nuevoRequisito ?? '').trim();
    if (!valor) return;
    this.asegurarFormulario();
    this.nodo.formulario!.requisitos.push(valor);
    this.formularioFormulario.patchValue({ nuevoRequisito: '' });
    this.autoGuardar.emit();
  }

  eliminarRequisito(indice: number): void {
    this.nodo?.formulario?.requisitos.splice(indice, 1);
    this.autoGuardar.emit();
  }

  agregarCampo(): void {
    if (!this.nodo || this.formularioCampo.invalid) return;
    this.asegurarFormulario();
    const campo: CampoFormulario = {
      nombre: this.formularioCampo.value.nombre,
      etiqueta: this.formularioCampo.value.etiqueta,
      tipoCampo: this.formularioCampo.value.tipoCampo,
      requerido: this.formularioCampo.value.requerido ?? false,
    };
    this.nodo.formulario!.campos.push(campo);
    this.formularioCampo.reset({ tipoCampo: 'TEXTO', requerido: false });
    this.autoGuardar.emit();
  }

  eliminarCampo(indice: number): void {
    this.nodo?.formulario?.campos.splice(indice, 1);
    this.autoGuardar.emit();
  }

  private asegurarFormulario(): void {
    if (!this.nodo!.formulario) {
      this.nodo!.formulario = {
        titulo: this.formularioFormulario.value.titulo ?? '',
        instrucciones: this.formularioFormulario.value.instrucciones ?? '',
        requisitos: [],
        campos: [],
      };
    }
  }
}
