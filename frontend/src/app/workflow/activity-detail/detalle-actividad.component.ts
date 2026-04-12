import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TramiteService, RespuestaTramite, RespuestaPaso } from '../../shared/services/tramite.service';
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
  cargando = true;

  // Para flujo condicional/iterativo
  condiciones: string[] = [];
  condicionElegida = '';

  tramiteId!: string;
  nodoId!: string;

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

    this.tramiteService.obtenerTramite(this.tramiteId).subscribe({
      next: (t) => {
        this.tramite = t;
        this.paso = t.pasos.find(p => p.nodoId === this.nodoId) ?? null;
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
    this.politicaService.obtenerPolitica(politicaId).subscribe({
      next: (p) => {
        this.nodo = p.nodos.find(n => n.id === this.nodoId) ?? null;
        this.construirFormulario();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  private construirFormulario(): void {
    const grupo: Record<string, any> = {};
    const campos = this.nodo?.formulario?.campos ?? [];
    campos.forEach(c => {
      grupo[c.nombre] = [this.paso?.datosFormulario?.[c.nombre] ?? ''];
    });
    this.formularioActividad = this.fb.group(grupo);

    // Preparar condiciones para flujo condicional/iterativo
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
