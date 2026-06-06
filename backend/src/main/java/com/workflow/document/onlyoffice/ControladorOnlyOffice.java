package com.workflow.document.onlyoffice;

import com.workflow.document.dto.ArchivoDescarga;
import com.workflow.document.onlyoffice.dto.RespuestaConfigOnlyOffice;
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
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;

/**
 * Endpoints de la co-edición en vivo con OnlyOffice.
 *
 * <ul>
 *   <li><b>config</b> — requiere JWT de la app + permiso; entrega la config firmada al editor.</li>
 *   <li><b>contenido</b> — lo consume el Document Server (sin JWT de la app); se autoriza con el
 *       token corto {@code ?oo=}.</li>
 *   <li><b>callback</b> — lo invoca el Document Server al guardar (BO5).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/documentos/{id}/onlyoffice")
@RequiredArgsConstructor
public class ControladorOnlyOffice {

  private final ServicioOnlyOffice servicioOnlyOffice;

  /** Config del editor para el documento. Protegido por JWT de la app + rol. */
  @GetMapping("/config")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<RespuestaConfigOnlyOffice> config(
      @PathVariable String id,
      @AuthenticationPrincipal User actor) {
    return ResponseEntity.ok(servicioOnlyOffice.construirConfig(id, actor));
  }

  /** Stream del binario de la versión actual. Lo descarga OnlyOffice; se valida el token {@code oo}. */
  @GetMapping("/contenido")
  public ResponseEntity<Resource> contenido(
      @PathVariable String id,
      @RequestParam("oo") String token) throws IOException {
    if (!servicioOnlyOffice.tokenValido(token, id)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token de descarga inválido");
    }
    ArchivoDescarga descarga = servicioOnlyOffice.cargarContenidoActual(id);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION,
            "inline; filename=\"" + descarga.nombreArchivo() + "\"")
        .contentType(MediaType.parseMediaType(descarga.tipoMime()))
        .body(descarga.recurso());
  }

  /**
   * Callback del Document Server: al guardar/cerrar, OnlyOffice envía aquí el estado y la URL del
   * archivo editado. El contrato exige responder SIEMPRE con {@code {"error": 0}} si todo fue bien,
   * o {@code {"error": 1}} si hubo un fallo (OnlyOffice reintentará).
   */
  @PostMapping("/callback")
  public ResponseEntity<Map<String, Object>> callback(
      @PathVariable String id,
      @RequestParam("oo") String token,
      @RequestBody Map<String, Object> body,
      @RequestHeader(value = "Authorization", required = false) String authHeader) {
    if (!servicioOnlyOffice.tokenValido(token, id)) {
      return ResponseEntity.ok(Map.of("error", 1));
    }
    try {
      servicioOnlyOffice.guardarDesdeCallback(id, body, authHeader);
      return ResponseEntity.ok(Map.of("error", 0));
    } catch (Exception e) {
      return ResponseEntity.ok(Map.of("error", 1));
    }
  }
}
