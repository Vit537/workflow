package com.workflow.consulta.controller;

import com.workflow.consulta.dto.RespuestaMensaje;
import com.workflow.consulta.service.ServicioMensaje;
import com.workflow.iam.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Mensajería de una consulta (cliente ↔ asesor). Accesible para el cliente dueño y para ASESOR/ADMIN.
 */
@RestController
@RequestMapping("/api/consultas/{consultaId}/mensajes")
@RequiredArgsConstructor
public class ControladorMensaje {

  private final ServicioMensaje servicioMensaje;

  @GetMapping
  @PreAuthorize("hasAnyRole('CLIENTE', 'ASESOR', 'ADMIN')")
  public ResponseEntity<List<RespuestaMensaje>> listar(
      @PathVariable String consultaId,
      @AuthenticationPrincipal User usuario) {
    return ResponseEntity.ok(servicioMensaje.listar(consultaId, usuario));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('CLIENTE', 'ASESOR', 'ADMIN')")
  public ResponseEntity<RespuestaMensaje> enviar(
      @PathVariable String consultaId,
      @RequestBody Map<String, String> body,
      @AuthenticationPrincipal User usuario) {
    return ResponseEntity.ok(servicioMensaje.enviar(consultaId, body.get("texto"), usuario));
  }
}
