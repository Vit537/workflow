import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
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
export class GestionPoliticasComponent implements OnInit {
  politicas: PoliticaResumen[] = [];
  cargando = false;
  errorCarga = false;
  panelAbierto = false;
  guardando = false;

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
    this.cargarPoliticas();
  }

  cargarPoliticas(): void {
    this.cargando = true;
    this.errorCarga = false;
    this.politicaService.listarPoliticas().subscribe({
      next: (lista) => {
        this.politicas = lista;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.errorCarga = true;
        this.mostrarMensaje('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
      },
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
        this.politicas = this.politicas.filter((p: PoliticaResumen) => p.id !== id);
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
