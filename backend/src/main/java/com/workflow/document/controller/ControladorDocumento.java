package com.workflow.document.controller;

import com.workflow.document.dto.ArchivoDescarga;
import com.workflow.document.dto.RespuestaDocumento;
import com.workflow.document.dto.RespuestaLogDocumento;
import com.workflow.document.service.ServicioDocumento;
import com.workflow.document.service.ServicioLogDocumento;
import com.workflow.iam.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Endpoints del repositorio documental (ADMIN/ASESOR). Las validaciones de permiso por rol
 * documental se integran en B4; la auditoría en B5; la colaboración en B6.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ControladorDocumento {

  private final ServicioDocumento servicioDocumento;
  private final ServicioLogDocumento servicioLog;

  // ── Repositorio de una política ─────────────────────────────────────────

  @GetMapping("/politicas/{politicaId}/documentos")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<List<RespuestaDocumento>> listar(
      @PathVariable String politicaId,
      @RequestParam(required = false) String nodoId) {
    return ResponseEntity.ok(servicioDocumento.listarPorPolitica(politicaId, nodoId));
  }

  @PostMapping(value = "/politicas/{politicaId}/documentos",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaDocumento> crear(
      @PathVariable String politicaId,
      @RequestParam("archivo") MultipartFile archivo,
      @RequestParam(required = false) String nombre,
      @RequestParam(required = false) String descripcion,
      @RequestParam(required = false) String nodoId,
      @RequestParam(required = false) String notaCambio,
      @AuthenticationPrincipal User actor) throws IOException {
    RespuestaDocumento creado = servicioDocumento.crearDocumento(
        politicaId, nodoId, null, nombre, descripcion, notaCambio, archivo, actor);
    return ResponseEntity.status(HttpStatus.CREATED).body(creado);
  }

  // ── Documento individual ──────────────────────────────────────────────────

  @GetMapping("/documentos/{id}")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaDocumento> obtener(
      @PathVariable String id,
      @AuthenticationPrincipal User actor) {
    return ResponseEntity.ok(servicioDocumento.obtener(id, actor));
  }

  @PostMapping(value = "/documentos/{id}/versiones", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaDocumento> subirVersion(
      @PathVariable String id,
      @RequestParam("archivo") MultipartFile archivo,
      @RequestParam(required = false) String notaCambio,
      @AuthenticationPrincipal User actor) throws IOException {
    return ResponseEntity.ok(servicioDocumento.subirVersion(id, notaCambio, archivo, actor));
  }

  @PostMapping("/documentos/{id}/restaurar/{numero}")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaDocumento> restaurar(
      @PathVariable String id,
      @PathVariable int numero,
      @AuthenticationPrincipal User actor) {
    return ResponseEntity.ok(servicioDocumento.restaurarVersion(id, numero, actor));
  }

  @DeleteMapping("/documentos/{id}")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<Void> archivar(
      @PathVariable String id,
      @AuthenticationPrincipal User actor) {
    servicioDocumento.archivar(id, actor);
    return ResponseEntity.noContent().build();
  }

  // ── Colaboración: comentarios y bloqueo (check-out) ───────────────────────

  @PostMapping("/documentos/{id}/comentarios")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaDocumento> comentar(
      @PathVariable String id,
      @RequestBody Map<String, String> body,
      @AuthenticationPrincipal User actor) {
    return ResponseEntity.ok(servicioDocumento.comentar(id, body.get("texto"), actor));
  }

  @PostMapping("/documentos/{id}/bloquear")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaDocumento> bloquear(
      @PathVariable String id,
      @AuthenticationPrincipal User actor) {
    return ResponseEntity.ok(servicioDocumento.bloquear(id, actor));
  }

  @PostMapping("/documentos/{id}/desbloquear")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaDocumento> desbloquear(
      @PathVariable String id,
      @AuthenticationPrincipal User actor) {
    return ResponseEntity.ok(servicioDocumento.desbloquear(id, actor));
  }

  // ── Descargas ─────────────────────────────────────────────────────────────

  @GetMapping("/documentos/{id}/descargar")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<Resource> descargarActual(
      @PathVariable String id,
      @AuthenticationPrincipal User actor) throws IOException {
    return responderDescarga(servicioDocumento.descargarActual(id, actor));
  }

  @GetMapping("/documentos/{id}/versiones/{numero}/descargar")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<Resource> descargarVersion(
      @PathVariable String id, @PathVariable int numero,
      @AuthenticationPrincipal User actor) throws IOException {
    return responderDescarga(servicioDocumento.descargarVersion(id, numero, actor));
  }

  private ResponseEntity<Resource> responderDescarga(ArchivoDescarga descarga) {
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + descarga.nombreArchivo() + "\"")
        .contentType(MediaType.parseMediaType(descarga.tipoMime()))
        .body(descarga.recurso());
  }

  // ── Logs de auditoría ─────────────────────────────────────────────────────

  @GetMapping("/documentos/{id}/logs")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<List<RespuestaLogDocumento>> logsDocumento(@PathVariable String id) {
    return ResponseEntity.ok(servicioLog.porDocumento(id));
  }

  @GetMapping("/politicas/{politicaId}/documentos/logs")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<List<RespuestaLogDocumento>> logsRepositorio(@PathVariable String politicaId) {
    return ResponseEntity.ok(servicioLog.porPolitica(politicaId));
  }
}
