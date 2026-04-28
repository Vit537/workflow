package com.workflow.execution.controller;

import com.workflow.execution.dto.RespuestaKpi;
import com.workflow.execution.service.ServicioKpi;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/kpis")
@RequiredArgsConstructor
public class ControladorKpi {

  private final ServicioKpi servicioKpi;

  /**
   * CU-14 — Dashboard de KPIs y cuellos de botella.
   * Accesible solo por administradores.
   */
  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<RespuestaKpi> obtenerKpis() {
    return ResponseEntity.ok(servicioKpi.calcularKpis());
  }
}
