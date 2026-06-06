import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClienteAuthService } from '../../shared/services/cliente-auth.service';

@Component({
  selector: 'app-cliente-login',
  templateUrl: './cliente-login.component.html',
  styleUrls: ['./cliente-auth.scss'],
  standalone: false,
})
export class ClienteLoginComponent {
  form: FormGroup;
  cargando = false;
  error = '';
  ocultar = true;

  constructor(private fb: FormBuilder, private auth: ClienteAuthService, private router: Router) {
    this.form = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ingresar(): void {
    if (this.form.invalid) return;
    this.cargando = true;
    this.error = '';
    const { correo, contrasena } = this.form.value;
    this.auth.iniciarSesion(correo, contrasena).subscribe({
      next: () => {
        this.cargando = false;
        if (this.auth.obtenerRol() === 'CLIENTE') {
          this.router.navigate(['/cliente/consultas']);
        } else {
          this.error = 'Esta cuenta no es de cliente. Usa el portal de administración.';
          this.auth.cerrarSesion();
        }
      },
      error: () => { this.cargando = false; this.error = 'Correo o contraseña incorrectos.'; },
    });
  }
}
