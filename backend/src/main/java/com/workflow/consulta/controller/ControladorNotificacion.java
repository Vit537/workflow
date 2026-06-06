package com.workflow.consulta.controller;

import com.workflow.consulta.dto.RespuestaNotificacion;
import com.workflow.consulta.service.ServicioNotificacionPersistente;
import com.workflow.iam.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Notificaciones del usuario autenticado (cliente, asesor o admin). */
@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class ControladorNotificacion {

  private final ServicioNotificacionPersistente servicio;

  @GetMapping
  public ResponseEntity<List<RespuestaNotificacion>> listar(@AuthenticationPrincipal User usuario) {
    return ResponseEntity.ok(servicio.listar(usuario));
  }

  @PatchMapping("/{id}/leer")
  public ResponseEntity<RespuestaNotificacion> marcarLeida(
      @PathVariable String id, @AuthenticationPrincipal User usuario) {
    return ResponseEntity.ok(servicio.marcarLeida(id, usuario));
  }

  @PatchMapping("/leer-todas")
  public ResponseEntity<Void> marcarTodasLeidas(@AuthenticationPrincipal User usuario) {
    servicio.marcarTodasLeidas(usuario);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> eliminar(
      @PathVariable String id, @AuthenticationPrincipal User usuario) {
    servicio.eliminar(id, usuario);
    return ResponseEntity.noContent().build();
  }
}
