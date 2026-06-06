import { HttpRequest, HttpHandlerFn, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ClienteAuthService } from '../services/cliente-auth.service';

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // No interceptar llamadas externas (ej. Groq API)
  if (req.url.startsWith('https://api.groq.com')) {
    return next(req);
  }

  const router = inject(Router);
  const authService = inject(AuthService);
  const clienteAuthService = inject(ClienteAuthService);

  // Seleccionar el token correcto según la ruta activa:
  // rutas /cliente/* → token del portal cliente (workflow_cliente_token)
  // cualquier otra ruta → token de staff (workflow_token)
  const esRutaCliente = router.url.startsWith('/cliente');

  let token: string | null = null;
  if (esRutaCliente && clienteAuthService.estaAutenticado()) {
    token = clienteAuthService.obtenerToken();
  } else if (!esRutaCliente && authService.estaAutenticado()) {
    token = authService.obtenerToken();
  }

  if (token) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }

  return next(req);
};
