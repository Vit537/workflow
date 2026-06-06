package com.workflow.execution.controller;

import com.workflow.execution.dto.RespuestaPasoCliente;
import com.workflow.execution.service.ServicioArchivos;
import com.workflow.execution.service.ServicioTramite;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Endpoints del lado del cliente (app Flutter).
 * Las rutas públicas no requieren JWT; las de descarga sí (solo asesor/admin).
 */
@RestController
@RequestMapping("/api/tramites")
@RequiredArgsConstructor
public class ControladorCliente {

  private final ServicioTramite servicioTramite;
  private final ServicioArchivos servicioArchivos;

  /**
   * CLIENTE/ASESOR/ADMIN — envía los datos de texto del formulario para el paso actual.
   * Body: { "campo1": "valor1", "campo2": "valor2", ... }
   */
  @PostMapping("/{tramiteId}/pasos/{nodoId}/datos-cliente")
  @PreAuthorize("hasAnyRole('CLIENTE', 'ASESOR', 'ADMIN')")
  public ResponseEntity<RespuestaPasoCliente> enviarDatosFormulario(
      @PathVariable String tramiteId,
      @PathVariable String nodoId,
      @RequestBody Map<String, Object> datos) {
    return ResponseEntity.ok(
        servicioTramite.enviarDatosFormularioCliente(tramiteId, nodoId, datos));
  }

  /**
   * CLIENTE/ASESOR/ADMIN — sube un archivo (foto, documento) para un campo del formulario.
   * Param "campo": nombre del campo en el formulario (ej. "fotoCasa", "croquis").
   */
  @PostMapping(value = "/{tramiteId}/pasos/{nodoId}/archivos",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAnyRole('CLIENTE', 'ASESOR', 'ADMIN')")
  public ResponseEntity<RespuestaPasoCliente> subirArchivo(
      @PathVariable String tramiteId,
      @PathVariable String nodoId,
      @RequestParam String campo,
      @RequestParam("archivo") MultipartFile archivo) throws IOException {
    return ResponseEntity.ok(
        servicioTramite.subirArchivoCliente(tramiteId, nodoId, campo, archivo));
  }

  /**
   * ASESOR/ADMIN — descarga un archivo subido por el cliente.
   * La ruta relativa se obtiene de datosFormulario[campo] del paso.
   */
  @GetMapping("/{tramiteId}/pasos/{nodoId}/archivos")
  @PreAuthorize("hasAnyRole('ADMIN', 'ASESOR')")
  public ResponseEntity<Resource> descargarArchivo(
      @PathVariable String tramiteId,
      @PathVariable String nodoId,
      @RequestParam String rutaRelativa) throws IOException {

    Resource recurso = servicioArchivos.cargarArchivo(rutaRelativa);
    String nombreArchivo = servicioArchivos.obtenerNombreArchivo(rutaRelativa);

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + nombreArchivo + "\"")
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .body(recurso);
  }
}
