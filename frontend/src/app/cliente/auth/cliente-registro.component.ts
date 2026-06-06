import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClienteAuthService } from '../../shared/services/cliente-auth.service';

@Component({
  selector: 'app-cliente-registro',
  templateUrl: './cliente-registro.component.html',
  styleUrls: ['./cliente-auth.scss'],
  standalone: false,
})
export class ClienteRegistroComponent {
  form: FormGroup;
  cargando = false;
  error = '';
  ocultar = true;

  constructor(private fb: FormBuilder, private auth: ClienteAuthService, private router: Router) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      telefono: [''],
      contrasena: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  registrar(): void {
    if (this.form.invalid) return;
    this.cargando = true;
    this.error = '';
    this.auth.registrarCliente(this.form.value).subscribe({
      next: () => { this.cargando = false; this.router.navigate(['/cliente/consultas']); },
      error: (e) => {
        this.cargando = false;
        this.error = e?.error?.mensaje || 'No se pudo crear la cuenta. ¿El correo ya existe?';
      },
    });
  }
}
