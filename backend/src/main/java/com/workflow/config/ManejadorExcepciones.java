package com.workflow.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ManejadorExcepciones {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> manejarValidacion(
      MethodArgumentNotValidException ex) {
    Map<String, String> errores = new HashMap<>();
    ex.getBindingResult().getAllErrors().forEach(error -> {
      String campo = ((FieldError) error).getField();
      String mensaje = error.getDefaultMessage();
      errores.put(campo, mensaje);
    });
    return construirRespuestaError(HttpStatus.BAD_REQUEST, "Error de validación", errores);
  }

  @ExceptionHandler(RuntimeException.class)
  public ResponseEntity<Map<String, Object>> manejarRuntimeException(RuntimeException ex) {
    return construirRespuestaError(HttpStatus.BAD_REQUEST, ex.getMessage(), null);
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<Map<String, Object>> manejarAccesoDenegado(AccessDeniedException ex) {
    return construirRespuestaError(HttpStatus.FORBIDDEN, "Acceso denegado", null);
  }

  @ExceptionHandler(BadCredentialsException.class)
  public ResponseEntity<Map<String, Object>> manejarCredencialesInvalidas(
      BadCredentialsException ex) {
    return construirRespuestaError(HttpStatus.UNAUTHORIZED, "Credenciales incorrectas", null);
  }

  private ResponseEntity<Map<String, Object>> construirRespuestaError(
      HttpStatus estado, String mensaje, Object detalles) {
    Map<String, Object> cuerpo = new HashMap<>();
    cuerpo.put("timestamp", Instant.now().toString());
    cuerpo.put("estado", estado.value());
    cuerpo.put("mensaje", mensaje);
    if (detalles != null) {
      cuerpo.put("detalles", detalles);
    }
    return ResponseEntity.status(estado).body(cuerpo);
  }
}
