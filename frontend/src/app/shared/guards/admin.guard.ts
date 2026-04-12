import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  // canActivate es requerido por la interfaz de Angular
  canActivate(): boolean | UrlTree {
    if (this.authService.estaAutenticado() && this.authService.obtenerRol() === 'ADMIN') {
      return true;
    }
    return this.router.createUrlTree(['/workflow/monitor']);
  }
}
