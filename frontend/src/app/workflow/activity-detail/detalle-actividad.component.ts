import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { TramiteService, RespuestaTramite, RespuestaPaso, EstadoPaso } from '../../shared/services/tramite.service';
import { PoliticaService } from '../../shared/services/politica.service';
import { Nodo, Formulario, CampoFormulario } from '../../shared/models/policy.model';

@Component({
  selector: 'app-detalle-actividad',
  templateUrl: './detalle-actividad.component.html',
  styleUrls: ['./detalle-actividad.component.scss'],
  standalone: false,
})
export class DetalleActividadComponent implements OnInit {
  tramite: RespuestaTramite | null = null;
  paso: RespuestaPaso | null = null;
  nodo: Nodo | null = null;
  formularioActividad!: FormGroup;
  completando = false;
  cambiandoEstado = false;
  cargando = true;
  cargandoNodo = false;  // carga secundaria del formulario/política

  condiciones: string[] = [];
  condicionElegida = '';

  tramiteId!: string;
  nodoId!: string;

  readonly estadosPaso: { valor: EstadoPaso; etiqueta: string; icono: string; color: string }[] = [
    { valor: 'EN_PROGRESO', etiqueta: 'En progreso',  icono: 'hourglass_bottom', color: 'accent' },
    { valor: 'BLOQUEADO',   etiqueta: 'Bloqueado',    icono: 'block',            color: 'warn'   },
    { valor: 'PENDIENTE',   etiqueta: 'Pendiente',    icono: 'schedule',         color: ''       },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private tramiteService: TramiteService,
    private politicaService: PoliticaService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.tramiteId = this.route.snapshot.paramMap.get('tramiteId')!;
    this.nodoId = this.route.snapshot.paramMap.get('nodoId')!;

    // Mismo patrón que detalle-politica: si el monitor pasó el objeto por state, lo usamos directamente
    const stateTramite = history.state?.tramite as RespuestaTramite | undefined;
    if (stateTramite?.id) {
      this.tramite = stateTramite;
      this.paso = stateTramite.pasos.find(p => p.nodoId === this.nodoId) ?? null;
      this.cargando = false;  // parar spinner inmediatamente con datos del state
      this.cargarNodo(stateTramite.politicaId);
      return;
    }

    // Fallback: navegación directa por URL
    this.tramiteService.obtenerTramite(this.tramiteId).subscribe({
      next: (t) => {
        this.tramite = t;
        this.paso = t.pasos.find(p => p.nodoId === this.nodoId) ?? null;
        this.cargando = false;  // parar spinner en cuanto llega el trámite
        this.cargarNodo(t.politicaId);
      },
      error: () => {
        this.cargando = false;
        this.snackBar.open('Error al cargar la actividad', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/workflow/monitor']);
      },
    });
  }

  private cargarNodo(politicaId: string): void {
    if (!politicaId) {
      this.cargandoNodo = false;
      return;
    }
    this.cargandoNodo = true;
    this.politicaService.obtenerPolitica(politicaId)
      .pipe(finalize(() => { this.cargandoNodo = false; }))
      .subscribe({
        next: (p) => {
          this.nodo = p.nodos.find(n => n.id === this.nodoId) ?? null;
          this.construirFormulario();
        },
        error: () => { /* finalize se encarga de cargandoNodo */ },
      });
  }

  private construirFormulario(): void {
    const grupo: Record<string, any> = {};
    const campos = this.nodo?.formulario?.campos ?? [];
    campos.forEach(c => {
      grupo[c.nombre] = [this.paso?.datosFormulario?.[c.nombre] ?? ''];
    });
    this.formularioActividad = this.fb.group(grupo);

    if (this.nodo?.tipoFlujo === 'CONDICIONAL' || this.nodo?.tipoFlujo === 'ITERATIVO') {
      this.condiciones = this.nodo.condiciones ?? [];
      if (this.nodo.tipoFlujo === 'ITERATIVO') {
        this.condiciones = ['salir', 'regresar'];
      }
    }
  }

  get campos(): CampoFormulario[] {
    return this.nodo?.formulario?.campos ?? [];
  }

  get formulario(): Formulario | undefined {
    return this.nodo?.formulario;
  }

  get necesitaCondicion(): boolean {
    return this.nodo?.tipoFlujo === 'CONDICIONAL' || this.nodo?.tipoFlujo === 'ITERATIVO';
  }

  /** Devuelve las entradas de datosFormulario del cliente (excluye campos vacíos) */
  get datosCliente(): { campo: string; valor: string }[] {
    if (!this.paso?.datosFormulario) return [];
    return Object.entries(this.paso.datosFormulario)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([campo, valor]) => ({ campo, valor: String(valor) }));
  }

  esArchivo(valor: unknown): boolean {
    return typeof valor === 'string' && (valor as string).startsWith('uploads/');
  }

  urlDescarga(valor: string): string {
    return this.tramiteService.urlDescargaArchivo(this.tramiteId, this.nodoId, valor);
  }

  nombreArchivo(ruta: string): string {
    return ruta.split('/').pop() ?? ruta;
  }

  cambiarEstado(estado: EstadoPaso): void {
    if (!this.paso) return;
    this.cambiandoEstado = true;
    this.tramiteService.cambiarEstadoPaso(this.tramiteId, this.nodoId, estado as any).subscribe({
      next: (t) => {
        this.tramite = t;
        this.paso = t.pasos.find(p => p.nodoId === this.nodoId) ?? null;
        this.cambiandoEstado = false;
        this.snackBar.open('Estado actualizado', 'OK', { duration: 2000 });
      },
      error: (err) => {
        this.cambiandoEstado = false;
        this.snackBar.open(err?.error?.mensaje ?? 'Error al cambiar estado', 'Cerrar', { duration: 3000 });
      },
    });
  }

  completarActividad(): void {
    if (!this.tramite || !this.paso) return;
    if (this.necesitaCondicion && !this.condicionElegida) {
      this.snackBar.open('Debes seleccionar una condición antes de continuar', 'Cerrar', { duration: 3000 });
      return;
    }

    this.completando = true;
    const datos = this.formularioActividad?.value ?? {};

    this.tramiteService.completarPaso(this.tramiteId, this.nodoId, {
      condicionElegida: this.condicionElegida || undefined,
      datosFormulario: datos,
    }).subscribe({
      next: (t) => {
        this.completando = false;
        const msg = t.estado === 'COMPLETADO'
          ? '¡Trámite finalizado exitosamente!'
          : 'Actividad completada. El trámite avanzó al siguiente paso.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        this.router.navigate(['/workflow/monitor']);
      },
      error: (err: any) => {
        this.completando = false;
        const msg = err?.error?.mensaje ?? 'Error al completar la actividad';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  volver(): void {
    this.router.navigate(['/workflow/monitor']);
  }
}
