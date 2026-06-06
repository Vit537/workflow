import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { ClienteAuthService } from '../services/cliente-auth.service';

@Injectable({ providedIn: 'root' })
export class ClienteGuard implements CanActivate {
  constructor(private clienteAuth: ClienteAuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (this.clienteAuth.estaAutenticado() && this.clienteAuth.obtenerRol() === 'CLIENTE') {
      return true;
    }
    return this.router.createUrlTree(['/cliente/login']);
  }
}
