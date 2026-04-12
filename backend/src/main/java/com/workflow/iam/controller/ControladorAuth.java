package com.workflow.iam.controller;

import com.workflow.iam.dto.RespuestaAuth;
import com.workflow.iam.dto.SolicitudLogin;
import com.workflow.iam.service.ServicioAuth;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
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
}
