package com.workflow.iam.service;

import com.workflow.config.JwtUtil;
import com.workflow.iam.dto.RespuestaAuth;
import com.workflow.iam.dto.SolicitudLogin;
import com.workflow.iam.model.User;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class ServicioAuth {

  private final AuthenticationManager authenticationManager;
  private final JwtUtil jwtUtil;

  public ServicioAuth(AuthenticationManager authenticationManager, JwtUtil jwtUtil) {
    this.authenticationManager = authenticationManager;
    this.jwtUtil = jwtUtil;
  }

  public RespuestaAuth iniciarSesion(SolicitudLogin solicitud) {
    Authentication autenticacion = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(
            solicitud.getCorreo(),
            solicitud.getContrasena()
        )
    );

    User usuario = (User) autenticacion.getPrincipal();
    String token = jwtUtil.generarToken(usuario, usuario.getRol().name());

    return RespuestaAuth.builder()
        .token(token)
        .id(usuario.getId())
        .nombre(usuario.getNombre())
        .correo(usuario.getCorreo())
        .rol(usuario.getRol())
        .build();
  }
}
