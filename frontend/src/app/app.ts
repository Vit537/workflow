import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './shared/services/auth.service';
import { Usuario } from './shared/models/user.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
})
export class App implements OnInit {
  mostrarNavbar = false;
  usuario: Usuario | null = null;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.mostrarNavbar = !e.urlAfterRedirects.startsWith('/login');
        this.usuario = this.authService.obtenerUsuarioActual();
      });

    this.authService.usuarioActual$.subscribe(u => {
      this.usuario = u;
    });
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
