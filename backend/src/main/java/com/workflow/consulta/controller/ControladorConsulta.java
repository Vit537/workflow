package com.workflow.consulta.controller;

import com.workflow.consulta.dto.RespuestaConsulta;
import com.workflow.consulta.dto.RespuestaConsultaCliente;
import com.workflow.consulta.dto.RespuestaVerificacionConsulta;
import com.workflow.consulta.dto.SolicitudAtenderConsulta;
import com.workflow.consulta.dto.SolicitudCrearConsulta;
import com.workflow.consulta.dto.SolicitudFcmToken;
import com.workflow.consulta.model.EstadoConsulta;
import com.workflow.consulta.service.ServicioConsulta;
import com.workflow.execution.service.ServicioTramite;
import com.workflow.iam.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/consultas")
@RequiredArgsConstructor
public class ControladorConsulta {

  private final ServicioConsulta servicioConsulta;
  private final ServicioTramite servicioTramite;

  /**
   * CLIENTE — crea una consulta ligada a su cuenta autenticada.
   */
  @PostMapping
  @PreAuthorize("hasRole('CLIENTE')")
  public ResponseEntity<RespuestaConsulta> crearConsulta(
      @Valid @RequestBody SolicitudCrearConsulta solicitud,
      @AuthenticationPrincipal User cliente) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(servicioConsulta.crearConsulta(solicitud, cliente));
  }

  /**
   * CLIENTE — lista las consultas del cliente autenticado (con su estado).
   */
  @GetMapping("/mias")
  @PreAuthorize("hasRole('CLIENTE')")
  public ResponseEntity<List<RespuestaConsulta>> misConsultas(
      @AuthenticationPrincipal User cliente) {
    return ResponseEntity.ok(servicioConsulta.listarMisConsultas(cliente));
  }

  /**
   * CLIENTE — detalle de una consulta propia con el progreso del trámite (pasos).
   */
  @GetMapping("/mias/{id}")
  @PreAuthorize("hasRole('CLIENTE')")
  public ResponseEntity<RespuestaConsultaCliente> miConsulta(
      @PathVariable String id,
      @AuthenticationPrincipal User cliente) {
    return ResponseEntity.ok(servicioConsulta.obtenerMiConsulta(id, cliente));
  }

  /**
   * PUBLIC — el cliente registra su FCM token para recibir notificaciones push.
   */
  @PostMapping("/{id}/fcm-token")
  public ResponseEntity<RespuestaConsulta> registrarFcmToken(
      @PathVariable String id,
      @Valid @RequestBody SolicitudFcmToken solicitud) {
    return ResponseEntity.ok(servicioConsulta.registrarFcmToken(id, solicitud.getFcmToken()));
  }

  /**
   * PUBLIC — el cliente consulta el estado de su consulta con el ID que le devolvimos.
   */
  @GetMapping("/{id}/estado")
  public ResponseEntity<RespuestaConsulta> estadoConsulta(@PathVariable String id) {
    return ResponseEntity.ok(servicioConsulta.estadoConsulta(id));
  }

  /**
   * PUBLIC — el cliente obtiene el paso activo actual de su trámite a través
   * del ID de su consulta. Solo ve el departamento actual y los campos que debe llenar.
   */
  @GetMapping("/{id}/paso-actual")
  public ResponseEntity<?> pasoActualCliente(@PathVariable String id) {
    com.workflow.consulta.dto.RespuestaConsulta consulta = servicioConsulta.estadoConsulta(id);
    if (consulta.getTramiteId() == null) {
      return ResponseEntity.ok(java.util.Map.of("mensaje",
          "Tu consulta está siendo revisada por un asesor. Recibirás una notificación pronto."));
    }
    return ResponseEntity.ok(servicioTramite.obtenerPasoActualCliente(consulta.getTramiteId()));
  }

  /**
   * ASESOR/ADMIN — doble verificación: busca la consulta más reciente del correo
   * y comprueba si la descripción proporcionada coincide.
   * Retorna la consulta + progreso del trámite vinculado.
   */
  @GetMapping("/verificar")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaVerificacionConsulta> verificarConsulta(
      @RequestParam String correo,
      @RequestParam(required = false) String descripcion) {
    return ResponseEntity.ok(servicioConsulta.verificarConsulta(correo, descripcion));
  }

  /**
   * ASESOR/ADMIN — lista todas las consultas, filtrando opcionalmente por estado.
   */
  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<List<RespuestaConsulta>> listarConsultas(
      @RequestParam(required = false) EstadoConsulta estado) {
    return ResponseEntity.ok(servicioConsulta.listarConsultas(estado));
  }

  /**
   * ASESOR/ADMIN — obtiene el detalle completo de una consulta.
   */
  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaConsulta> obtenerConsulta(@PathVariable String id) {
    return ResponseEntity.ok(servicioConsulta.obtenerConsulta(id));
  }

  /**
   * ASESOR/ADMIN — atiende la consulta: escribe un mensaje, vincula una política
   * (opcional) e inicia el trámite. Envía notificación push al cliente.
   */
  @PostMapping("/{id}/atender")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaConsulta> atenderConsulta(
      @PathVariable String id,
      @Valid @RequestBody SolicitudAtenderConsulta solicitud,
      Authentication autenticacion) {
    return ResponseEntity.ok(
        servicioConsulta.atenderConsulta(id, solicitud, autenticacion.getName()));
  }

  /**
   * ASESOR/ADMIN — marca la consulta como completada y notifica al cliente.
   */
  @PostMapping("/{id}/completar")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaConsulta> completarConsulta(
      @PathVariable String id,
      Authentication autenticacion) {
    return ResponseEntity.ok(
        servicioConsulta.completarConsulta(id, autenticacion.getName()));
  }
}
