package com.workflow.iam.controller;

import com.workflow.iam.dto.RespuestaUsuario;
import com.workflow.iam.dto.SolicitudActualizarUsuario;
import com.workflow.iam.dto.SolicitudCrearUsuario;
import com.workflow.iam.service.ServicioUsuario;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
public class ControladorUsuario {

  private final ServicioUsuario servicioUsuario;

  public ControladorUsuario(ServicioUsuario servicioUsuario) {
    this.servicioUsuario = servicioUsuario;
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<List<RespuestaUsuario>> listarUsuarios() {
    return ResponseEntity.ok(servicioUsuario.listarUsuarios());
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<RespuestaUsuario> obtenerUsuario(@PathVariable String id) {
    return ResponseEntity.ok(servicioUsuario.obtenerUsuarioPorId(id));
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<RespuestaUsuario> crearUsuario(
      @Valid @RequestBody SolicitudCrearUsuario solicitud) {
    RespuestaUsuario creado = servicioUsuario.crearUsuario(solicitud);
    return ResponseEntity.status(HttpStatus.CREATED).body(creado);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<RespuestaUsuario> actualizarUsuario(
      @PathVariable String id,
      @RequestBody SolicitudActualizarUsuario solicitud) {
    return ResponseEntity.ok(servicioUsuario.actualizarUsuario(id, solicitud));
  }

  @PatchMapping("/{id}/desactivar")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> desactivarUsuario(@PathVariable String id) {
    servicioUsuario.desactivarUsuario(id);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/{id}/activar")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> activarUsuario(@PathVariable String id) {
    servicioUsuario.activarUsuario(id);
    return ResponseEntity.noContent().build();
  }
}
