import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PoliticaService } from '../../shared/services/politica.service';
import { TramiteService, RespuestaTramite } from '../../shared/services/tramite.service';
import { Politica, PoliticaResumen, Nodo } from '../../shared/models/policy.model';

@Component({
  selector: 'app-detalle-politica',
  templateUrl: './detalle-politica.component.html',
  styleUrls: ['./detalle-politica.component.scss'],
  standalone: false,
})
export class DetallePoliticaComponent implements OnInit {
  politica: Politica | null = null;
  cargando = true;
  cargandoNodos = false;
  iniciandoTramite = false;
  nodoExpandido: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private politicaService: PoliticaService,
    private tramiteService: TramiteService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const statePolitica = history.state?.politicaResumen as Politica | undefined;

    if (statePolitica?.id && statePolitica?.nodos) {
      // Objeto completo disponible desde la lista → sin llamada HTTP
      this.politica = statePolitica;
      this.cargando = false;
      this.cargandoNodos = false;
      return;
    }

    // Fallback: navegación directa por URL
    this.politicaService.obtenerPolitica(id).subscribe({
      next: (p) => {
        this.politica = p;
        this.cargando = false;
        this.cargandoNodos = false;
      },
      error: () => {
        this.cargandoNodos = false;
        this.cargando = false;
        this.snackBar.open('Error al cargar la política', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/workflow/politicas']);
      },
    });
  }

  toggleNodo(nodoId: string): void {
    this.nodoExpandido = this.nodoExpandido === nodoId ? null : nodoId;
  }

  iniciarTramite(): void {
    if (!this.politica) return;
    this.iniciandoTramite = true;
    this.tramiteService.crearTramite(this.politica.id).subscribe({
      next: (tramite: RespuestaTramite) => {
        this.iniciandoTramite = false;
        this.snackBar.open('Trámite iniciado correctamente', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/workflow/monitor']);
      },
      error: (err: any) => {
        this.iniciandoTramite = false;
        const msg = err?.error?.mensaje ?? 'Error al iniciar el trámite';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  get nodosConFormulario(): Nodo[] {
    return this.politica?.nodos.filter(n =>
      n.formulario && (n.formulario.campos?.length || n.formulario.requisitos?.length)
    ) ?? [];
  }

  volver(): void {
    this.router.navigate(['/workflow/politicas']);
  }
}
