import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable, catchError, of, switchMap } from 'rxjs';
import { RespuestaUsuario } from '../../shared/models/user.model';
import {
  SolicitudCrearUsuario,
  SolicitudActualizarUsuario,
  UsuarioService,
} from '../../shared/services/usuario.service';

@Component({
  selector: 'app-gestion-usuarios',
  templateUrl: './gestion-usuarios.component.html',
  styleUrls: ['./gestion-usuarios.component.scss'],
  standalone: false,
})
export class GestionUsuariosComponent implements OnInit {
  columnasMostradas = ['nombre', 'correo', 'rol', 'estado', 'acciones'];

  // BehaviorSubject como trigger de recarga — evita el NG0100
  private recarga$ = new BehaviorSubject<void>(undefined);
  usuarios$!: Observable<RespuestaUsuario[]>;

  // Panel lateral para crear/editar
  panelAbierto = false;
  editando = false;
  idUsuarioEditando: string | null = null;
  formularioUsuario!: FormGroup;

  constructor(
    private servicioUsuario: UsuarioService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.usuarios$ = this.recarga$.pipe(
      switchMap(() =>
        this.servicioUsuario.listarUsuarios().pipe(
          catchError(() => {
            this.mostrarNotificacion('Error al cargar los usuarios', 'error');
            return of([]);
          })
        )
      )
    );
  }

  cargarUsuarios(): void {
    this.recarga$.next();
  }

  abrirCrearUsuario(): void {
    this.editando = false;
    this.idUsuarioEditando = null;
    this.formularioUsuario.reset();
    this.formularioUsuario.get('contrasena')?.setValidators([
      Validators.required,
      Validators.minLength(6),
    ]);
    this.formularioUsuario.get('contrasena')?.updateValueAndValidity();
    this.panelAbierto = true;
  }

  abrirEditarUsuario(usuario: RespuestaUsuario): void {
    this.editando = true;
    this.idUsuarioEditando = usuario.id;
    this.formularioUsuario.patchValue({
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    });
    this.formularioUsuario.get('contrasena')?.clearValidators();
    this.formularioUsuario.get('contrasena')?.updateValueAndValidity();
    this.panelAbierto = true;
  }

  guardarUsuario(): void {
    if (this.formularioUsuario.invalid) return;

    const valores = this.formularioUsuario.value;

    if (this.editando && this.idUsuarioEditando) {
      const solicitud: SolicitudActualizarUsuario = {
        nombre: valores.nombre,
        correo: valores.correo,
        rol: valores.rol,
      };
      if (valores.contrasena) {
        solicitud.contrasena = valores.contrasena;
      }

      this.servicioUsuario.actualizarUsuario(this.idUsuarioEditando, solicitud).subscribe({
        next: () => {
          this.mostrarNotificacion('Usuario actualizado correctamente');
          this.cerrarPanel();
          this.cargarUsuarios();
        },
        error: (err) => this.mostrarNotificacion(err.error?.mensaje ?? 'Error al actualizar', 'error'),
      });
    } else {
      const solicitud: SolicitudCrearUsuario = {
        nombre: valores.nombre,
        correo: valores.correo,
        contrasena: valores.contrasena,
        rol: valores.rol,
      };

      this.servicioUsuario.crearUsuario(solicitud).subscribe({
        next: () => {
          this.mostrarNotificacion('Usuario creado correctamente');
          this.cerrarPanel();
          this.cargarUsuarios();
        },
        error: (err) => this.mostrarNotificacion(err.error?.mensaje ?? 'Error al crear usuario', 'error'),
      });
    }
  }

  desactivarUsuario(usuario: RespuestaUsuario): void {
    if (!confirm(`¿Desactivar al usuario ${usuario.nombre}? No podrá iniciar sesión.`)) return;

    this.servicioUsuario.desactivarUsuario(usuario.id).subscribe({
      next: () => {
        this.mostrarNotificacion('Usuario desactivado');
        this.cargarUsuarios();
      },
      error: () => this.mostrarNotificacion('Error al desactivar el usuario', 'error'),
    });
  }

  activarUsuario(usuario: RespuestaUsuario): void {
    if (!confirm(`¿Reactivar al usuario ${usuario.nombre}? Podrá iniciar sesión nuevamente.`)) return;

    this.servicioUsuario.activarUsuario(usuario.id).subscribe({
      next: () => {
        this.mostrarNotificacion('Usuario reactivado correctamente');
        this.cargarUsuarios();
      },
      error: () => this.mostrarNotificacion('Error al reactivar el usuario', 'error'),
    });
  }

  cerrarPanel(): void {
    this.panelAbierto = false;
    this.formularioUsuario.reset();
  }

  private inicializarFormulario(): void {
    this.formularioUsuario = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]],
      rol: ['', Validators.required],
    });
  }

  private mostrarNotificacion(mensaje: string, tipo: 'exito' | 'error' = 'exito'): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 4000,
      panelClass: tipo === 'error' ? ['snack-error'] : ['snack-exito'],
    });
  }
}
