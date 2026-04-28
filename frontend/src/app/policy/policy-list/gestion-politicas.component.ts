import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable, Subscription, catchError, of, switchMap, timer } from 'rxjs';
import { PoliticaResumen } from '../../shared/models/policy.model';
import {
  PoliticaService,
  SolicitudCrearPolitica,
} from '../../shared/services/politica.service';

@Component({
  selector: 'app-gestion-politicas',
  templateUrl: './gestion-politicas.component.html',
  styleUrls: ['./gestion-politicas.component.scss'],
  standalone: false,
})
export class GestionPoliticasComponent implements OnInit, OnDestroy {
  private recarga$ = new BehaviorSubject<void>(undefined);
  politicas$!: Observable<PoliticaResumen[]>;
  panelAbierto = false;
  guardando = false;
  private readonly intervaloRefrescoMs = 15000;
  private refrescoAutomaticoSub?: Subscription;

  formularioCrear!: FormGroup;
  columnas = ['nombre', 'estado', 'creadoPor', 'creadoEn', 'acciones'];

  constructor(
    private politicaService: PoliticaService,
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.formularioCrear = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
    });

    this.politicas$ = this.recarga$.pipe(
      switchMap(() =>
        this.politicaService.listarPoliticas().pipe(
          catchError((err) => {
            const detalle = err?.status ? ` (HTTP ${err.status})` : '';
            this.mostrarMensaje(`No se pudo conectar con el servidor${detalle}. Verifica backend y token.`);
            return of(this.politicaService.obtenerPoliticasCache());
          })
        )
      )
    );

    this.iniciarRefrescoAutomatico();
  }

  ngOnDestroy(): void {
    this.refrescoAutomaticoSub?.unsubscribe();
  }

  @HostListener('window:focus')
  alRecuperarFoco(): void {
    this.recarga$.next();
  }

  cargar(): void {
    this.recarga$.next();
  }

  private iniciarRefrescoAutomatico(): void {
    this.refrescoAutomaticoSub = timer(this.intervaloRefrescoMs, this.intervaloRefrescoMs).subscribe(() => {
      this.recarga$.next();
    });
  }

  abrirPanel(): void {
    this.formularioCrear.reset();
    this.panelAbierto = true;
  }

  cerrarPanel(): void {
    this.panelAbierto = false;
  }

  crearPolitica(): void {
    if (this.formularioCrear.invalid) return;
    this.guardando = true;
    const solicitud: SolicitudCrearPolitica = {
      nombre: this.formularioCrear.value.nombre,
      descripcion: this.formularioCrear.value.descripcion || '',
    };
    this.politicaService.crearPolitica(solicitud).subscribe({
      next: (politica) => {
        this.guardando = false;
        this.cerrarPanel();
        this.router.navigate(['/policy/editor', politica.id]);
      },
      error: () => {
        this.guardando = false;
        this.mostrarMensaje('Error al crear la política');
      },
    });
  }

  abrirEditor(id: string): void {
    this.router.navigate(['/policy/editor', id]);
  }

  eliminarPolitica(id: string): void {
    if (!confirm('¿Seguro que desea eliminar esta política?')) return;
    this.politicaService.eliminarPolitica(id).subscribe({
      next: () => {
        this.recarga$.next();
        this.mostrarMensaje('Política eliminada');
      },
      error: (err) => {
        this.mostrarMensaje(err?.error?.mensaje || 'No se puede eliminar esta política');
      },
    });
  }

  etiquetaEstado(estado: string): string {
    const mapa: Record<string, string> = {
      BORRADOR: 'Borrador',
      PUBLICADA: 'Publicada',
      ARCHIVADA: 'Archivada',
    };
    return mapa[estado] ?? estado;
  }

  colorEstado(estado: string): string {
    const mapa: Record<string, string> = {
      BORRADOR: 'accent',
      PUBLICADA: 'primary',
      ARCHIVADA: '',
    };
    return mapa[estado] ?? '';
  }

  private mostrarMensaje(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
  }
}
