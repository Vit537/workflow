import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, of, switchMap } from 'rxjs';
import { ConsultaService } from '../../shared/services/consulta.service';
import { Consulta, EstadoConsulta } from '../../shared/models/consulta.model';

@Component({
  selector: 'app-lista-consultas',
  templateUrl: './lista-consultas.component.html',
  styleUrls: ['./lista-consultas.component.scss'],
  standalone: false,
})
export class ListaConsultasComponent implements OnInit {
  private filtro$ = new BehaviorSubject<EstadoConsulta | undefined>(undefined);
  consultas$!: Observable<Consulta[]>;
  error = '';

  filtroEstado: EstadoConsulta | '' = '';

  readonly estados: { valor: EstadoConsulta | ''; etiqueta: string }[] = [
    { valor: '', etiqueta: 'Todas' },
    { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
    { valor: 'EN_ATENCION', etiqueta: 'En atención' },
    { valor: 'COMPLETADA', etiqueta: 'Completadas' },
  ];

  constructor(
    private consultaService: ConsultaService,
    private router: Router,
  ) {}

  /** Conversaciones activas: consultas en atención (sección "Chats"). */
  chats$!: Observable<Consulta[]>;
  private recargarChats$ = new BehaviorSubject<void>(undefined);

  ngOnInit(): void {
    this.consultas$ = this.filtro$.pipe(
      switchMap((estado) =>
        this.consultaService.listar(estado).pipe(
          catchError(() => {
            this.error = 'Error al cargar consultas';
            return of([]);
          })
        )
      )
    );

    this.chats$ = this.recargarChats$.pipe(
      switchMap(() =>
        this.consultaService.listar('EN_ATENCION').pipe(catchError(() => of([])))
      )
    );
  }

  recargarChats(): void {
    this.recargarChats$.next();
  }

  /** Abre el detalle directamente en la pestaña de chat. */
  verChat(id: string, consulta: Consulta): void {
    this.router.navigate(['/workflow/consultas', id], { state: { consulta, tab: 'chat' } });
  }

  cargar(): void {
    this.error = '';
    this.filtro$.next(this.filtroEstado as EstadoConsulta | undefined || undefined);
  }

  cambiarFiltro(): void {
    this.error = '';
    this.filtro$.next(this.filtroEstado as EstadoConsulta | undefined || undefined);
  }

  verDetalle(id: string, consulta: Consulta): void {
    this.router.navigate(['/workflow/consultas', id], { state: { consulta } });
  }

  etiquetaEstado(estado: EstadoConsulta): string {
    const mapa: Record<EstadoConsulta, string> = {
      PENDIENTE: 'Pendiente',
      EN_ATENCION: 'En atención',
      COMPLETADA: 'Completada',
    };
    return mapa[estado] ?? estado;
  }

  claseEstado(estado: EstadoConsulta): string {
    const mapa: Record<EstadoConsulta, string> = {
      PENDIENTE: 'badge-pendiente',
      EN_ATENCION: 'badge-atencion',
      COMPLETADA: 'badge-completada',
    };
    return mapa[estado] ?? '';
  }
}
