import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);

  // No interceptar llamadas externas (ej. Groq API)
  if (req.url.startsWith('https://api.groq.com')) {
    return next(req);
  }

  // Solo agregar el token si existe Y no está expirado
  if (authService.estaAutenticado()) {
    const token = authService.obtenerToken()!;
    const clonado = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(clonado);
  }

  return next(req);
};
