package com.workflow.document.onlyoffice;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuración de la integración con OnlyOffice Document Server (co-edición en vivo).
 *
 * <p>Propiedades en {@code application.properties} bajo el prefijo {@code app.onlyoffice}.
 * Si {@link #enabled} es {@code false}, el sistema funciona igual que antes (sin edición en vivo).</p>
 */
@Data
@Component
@ConfigurationProperties(prefix = "app.onlyoffice")
public class OnlyOfficeProperties {

  /** Activa/desactiva la integración con OnlyOffice. */
  private boolean enabled = true;

  /**
   * URL pública del Document Server que carga el NAVEGADOR para traer el editor ({@code api.js}).
   * Ej.: {@code http://localhost:8082}.
   */
  private String publicUrl = "http://localhost:8082";

  /**
   * Base que usa el Document Server (en Docker) para volver al backend del host.
   * En Docker Desktop: {@code http://host.docker.internal:8080} (NO localhost).
   */
  private String backendBaseUrl = "http://host.docker.internal:8080";

  /**
   * Secreto JWT compartido con el contenedor (= {@code JWT_SECRET} del docker-compose).
   * Vacío/blank desactiva la firma (solo desarrollo).
   */
  private String jwtSecret = "";

  /** Vigencia (minutos) del token corto que firma las URLs expuestas a OnlyOffice. */
  private int callbackTokenTtlMin = 120;

  /** {@code true} si hay un secreto configurado para firmar/verificar JWT de OnlyOffice. */
  public boolean firmaActiva() {
    return jwtSecret != null && !jwtSecret.isBlank();
  }
}
