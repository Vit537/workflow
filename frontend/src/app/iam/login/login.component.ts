import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false,
})
export class LoginComponent implements OnInit {
  formularioLogin!: FormGroup;
  cargando = false;
  mensajeError = '';
  ocultarContrasena = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  // ngOnInit es requerido por la interfaz OnInit de Angular
  ngOnInit(): void {
    const rol = this.authService.obtenerRol();
    if (this.authService.estaAutenticado() && (rol === 'ADMIN' || rol === 'ASESOR')) {
      this.redirigirSegunRol();
    }

    this.formularioLogin = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  iniciarSesion(): void {
    if (this.formularioLogin.invalid) return;

    this.cargando = true;
    this.mensajeError = '';

    const { correo, contrasena } = this.formularioLogin.value;

    this.authService.iniciarSesion(correo, contrasena).subscribe({
      next: () => {
        this.cargando = false;
        this.redirigirSegunRol();
      },
      error: () => {
        this.cargando = false;
        this.mensajeError = 'Correo o contraseña incorrectos. Por favor revise sus datos.';
      },
    });
  }

  private redirigirSegunRol(): void {
    const rol = this.authService.obtenerRol();
    if (rol === 'ADMIN') {
      this.router.navigate(['/policy']);
    } else if (rol === 'ASESOR') {
      this.router.navigate(['/workflow/monitor']);
    } else {
      // CLIENTE u otro rol no debe usar este login
      this.authService.cerrarSesion();
    }
  }
}
