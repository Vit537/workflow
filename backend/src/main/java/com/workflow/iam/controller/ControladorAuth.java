package com.workflow.iam.controller;

import com.workflow.iam.dto.RespuestaAuth;
import com.workflow.iam.dto.RespuestaUsuario;
import com.workflow.iam.dto.SolicitudLogin;
import com.workflow.iam.dto.SolicitudRegistro;
import com.workflow.iam.model.User;
import com.workflow.iam.service.ServicioAuth;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class ControladorAuth {

  private final ServicioAuth servicioAuth;

  public ControladorAuth(ServicioAuth servicioAuth) {
    this.servicioAuth = servicioAuth;
  }

  @PostMapping("/login")
  public ResponseEntity<RespuestaAuth> iniciarSesion(@Valid @RequestBody SolicitudLogin solicitud) {
    RespuestaAuth respuesta = servicioAuth.iniciarSesion(solicitud);
    return ResponseEntity.ok(respuesta);
  }

  /** Registro público de un cliente (rol CLIENTE). Devuelve el JWT. */
  @PostMapping("/registro")
  public ResponseEntity<RespuestaAuth> registrarCliente(
      @Valid @RequestBody SolicitudRegistro solicitud) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(servicioAuth.registrarCliente(solicitud));
  }

  // TODO (Google sign-in, pendiente): POST /api/auth/google
  // Verificar el ID token de Firebase/Google → crear/enlazar usuario CLIENTE → emitir JWT.

  @GetMapping("/me")
  public ResponseEntity<RespuestaUsuario> obtenerPerfil(@AuthenticationPrincipal User usuario) {
    RespuestaUsuario respuesta = RespuestaUsuario.builder()
        .id(usuario.getId())
        .nombre(usuario.getNombre())
        .correo(usuario.getCorreo())
        .rol(usuario.getRol())
        .activo(usuario.isActivo())
        .build();
    return ResponseEntity.ok(respuesta);
  }
}
