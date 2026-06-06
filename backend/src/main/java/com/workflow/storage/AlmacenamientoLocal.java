package com.workflow.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * Almacenamiento en disco local. Los archivos se guardan bajo {@code app.storage.local.dir}.
 *
 * <p>Activa cuando {@code app.storage.type=local} (valor por defecto si la propiedad no está).</p>
 */
@Component
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
public class AlmacenamientoLocal implements AlmacenamientoArchivos {

  private final Path baseDir;

  public AlmacenamientoLocal(
      @Value("${app.storage.local.dir:${app.upload.dir:uploads}}") String localDir) {
    this.baseDir = Paths.get(localDir).toAbsolutePath().normalize();
  }

  @Override
  public String guardar(String key, MultipartFile archivo) throws IOException {
    Path destino = resolverSeguro(key);
    Files.createDirectories(destino.getParent());
    Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);
    return key;
  }

  @Override
  public String guardarBytes(String key, byte[] contenido) throws IOException {
    Path destino = resolverSeguro(key);
    Files.createDirectories(destino.getParent());
    Files.write(destino, contenido);
    return key;
  }

  @Override
  public Resource cargar(String key) throws IOException {
    Path ruta = resolverSeguro(key);
    Resource recurso = new UrlResource(ruta.toUri());
    if (!recurso.exists() || !recurso.isReadable()) {
      throw new RuntimeException("Archivo no encontrado: " + key);
    }
    return recurso;
  }

  @Override
  public void eliminar(String key) throws IOException {
    Files.deleteIfExists(resolverSeguro(key));
  }

  @Override
  public boolean existe(String key) {
    return Files.exists(resolverSeguro(key));
  }

  /**
   * Resuelve la clave contra el directorio base y verifica que no escape de él
   * (protección contra path traversal).
   */
  private Path resolverSeguro(String key) {
    Path ruta = baseDir.resolve(key).normalize();
    if (!ruta.startsWith(baseDir)) {
      throw new SecurityException("Acceso denegado: ruta fuera del directorio permitido");
    }
    return ruta;
  }
}
