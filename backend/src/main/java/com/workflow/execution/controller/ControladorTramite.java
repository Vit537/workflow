package com.workflow.execution.controller;

import com.workflow.execution.dto.RespuestaTramite;
import com.workflow.execution.dto.SolicitudCambiarEstadoPaso;
import com.workflow.execution.dto.SolicitudCompletarPaso;
import com.workflow.execution.dto.SolicitudCrearTramite;
import com.workflow.execution.service.ServicioTramite;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tramites")
@RequiredArgsConstructor
public class ControladorTramite {

  private final ServicioTramite servicioTramite;

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaTramite> crearTramite(
      @Valid @RequestBody SolicitudCrearTramite solicitud,
      Authentication autenticacion) {
    String correo = autenticacion.getName();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(servicioTramite.crearTramite(solicitud, correo));
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<List<RespuestaTramite>> listarTramitesActivos() {
    return ResponseEntity.ok(servicioTramite.listarTramitesActivos());
  }

  /** CU-12 — Monitor personal del asesor con datos del cliente vinculado. */
  @GetMapping("/mis-actividades")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<List<RespuestaTramite>> misActividades(Authentication autenticacion) {
    return ResponseEntity.ok(servicioTramite.listarTramitesPorAsesor(autenticacion.getName()));
  }

  /** CU-12 — Detalle de un trámite con datos del cliente y formularios por paso. */
  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaTramite> obtenerTramite(@PathVariable String id) {
    return ResponseEntity.ok(servicioTramite.obtenerTramite(id));
  }

  /**
   * CU-12/13 — El asesor cambia el estado de un paso a PENDIENTE, EN_PROGRESO o BLOQUEADO
   * sin avanzar el motor de flujo.
   */
  @PatchMapping("/{tramiteId}/pasos/{nodoId}/estado")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaTramite> cambiarEstadoPaso(
      @PathVariable String tramiteId,
      @PathVariable String nodoId,
      @Valid @RequestBody SolicitudCambiarEstadoPaso solicitud) {
    return ResponseEntity.ok(
        servicioTramite.cambiarEstadoPaso(tramiteId, nodoId, solicitud.getEstado()));
  }

  /** CU-13 — El asesor completa un paso y el motor avanza al siguiente departamento. */
  @PostMapping("/{tramiteId}/pasos/{nodoId}/completar")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaTramite> completarPaso(
      @PathVariable String tramiteId,
      @PathVariable String nodoId,
      @RequestBody(required = false) SolicitudCompletarPaso solicitud) {
    if (solicitud == null) solicitud = new SolicitudCompletarPaso();
    return ResponseEntity.ok(servicioTramite.completarPaso(tramiteId, nodoId, solicitud));
  }
}
