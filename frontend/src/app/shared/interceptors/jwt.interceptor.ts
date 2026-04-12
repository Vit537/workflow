import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const token = authService.obtenerToken();

  if (token) {
    const clonado = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(clonado);
  }

  return next(req);
};
