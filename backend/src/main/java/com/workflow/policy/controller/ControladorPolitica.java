package com.workflow.policy.controller;

import com.workflow.policy.dto.RespuestaPolitica;
import com.workflow.policy.dto.RespuestaPoliticaResumen;
import com.workflow.policy.dto.SolicitudActualizarDiagrama;
import com.workflow.policy.dto.SolicitudActualizarPolitica;
import com.workflow.policy.dto.SolicitudCrearPolitica;
import com.workflow.policy.model.EstadoPolitica;
import com.workflow.policy.service.ServicioPolitica;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/politicas")
@RequiredArgsConstructor
public class ControladorPolitica {

  private final ServicioPolitica servicioPolitica;

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<List<RespuestaPoliticaResumen>> listarPoliticas(
      @RequestParam(required = false) EstadoPolitica estado) {
    if (estado != null) {
      return ResponseEntity.ok(servicioPolitica.listarPoliticasPorEstado(estado));
    }
    return ResponseEntity.ok(servicioPolitica.listarPoliticas());
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaPolitica> obtenerPolitica(@PathVariable String id) {
    return ResponseEntity.ok(servicioPolitica.obtenerPoliticaPorId(id));
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<RespuestaPolitica> crearPolitica(
      @Valid @RequestBody SolicitudCrearPolitica solicitud,
      Authentication autenticacion) {
    String correoAdmin = autenticacion.getName();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(servicioPolitica.crearPolitica(solicitud, correoAdmin));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<RespuestaPolitica> actualizarPolitica(
      @PathVariable String id,
      @RequestBody SolicitudActualizarPolitica solicitud) {
    return ResponseEntity.ok(servicioPolitica.actualizarPolitica(id, solicitud));
  }

  @PutMapping("/{id}/diagrama")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<RespuestaPolitica> actualizarDiagrama(
      @PathVariable String id,
      @RequestBody SolicitudActualizarDiagrama solicitud) {
    return ResponseEntity.ok(servicioPolitica.actualizarDiagrama(id, solicitud));
  }

  @PatchMapping("/{id}/publicar")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<RespuestaPolitica> publicarPolitica(@PathVariable String id) {
    return ResponseEntity.ok(servicioPolitica.publicarPolitica(id));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> eliminarPolitica(@PathVariable String id) {
    servicioPolitica.eliminarPolitica(id);
    return ResponseEntity.noContent().build();
  }
}
