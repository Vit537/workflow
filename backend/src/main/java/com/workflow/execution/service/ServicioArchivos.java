package com.workflow.execution.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Maneja el almacenamiento físico de archivos subidos por los clientes.
 * Los archivos se guardan en: <uploadDir>/<tramiteId>/<nodoId>/<campo>_<uuid>.<ext>
 */
@Service
public class ServicioArchivos {

  @Value("${app.upload.dir:uploads}")
  private String uploadDir;

  /**
   * Guarda el archivo en disco y devuelve la ruta relativa para almacenar en MongoDB.
   */
  public String guardarArchivo(String tramiteId, String nodoId, String campo,
      MultipartFile archivo) throws IOException {

    String extension = obtenerExtension(archivo.getOriginalFilename());
    String nombreArchivo = campo + "_" + UUID.randomUUID() + extension;

    Path directorio = Paths.get(uploadDir, tramiteId, nodoId).toAbsolutePath().normalize();
    Files.createDirectories(directorio);

    Path destino = directorio.resolve(nombreArchivo);
    Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

    // Ruta relativa para guardar en DB (separador siempre /)
    return tramiteId + "/" + nodoId + "/" + nombreArchivo;
  }

  /**
   * Carga un archivo desde disco como Resource descargable.
   */
  public Resource cargarArchivo(String rutaRelativa) throws IOException {
    Path ruta = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(rutaRelativa).normalize();

    // Verificar que la ruta no escape del directorio base (path traversal protection)
    Path base = Paths.get(uploadDir).toAbsolutePath().normalize();
    if (!ruta.startsWith(base)) {
      throw new SecurityException("Acceso denegado: ruta fuera del directorio permitido");
    }

    Resource recurso = new UrlResource(ruta.toUri());
    if (!recurso.exists() || !recurso.isReadable()) {
      throw new RuntimeException("Archivo no encontrado: " + rutaRelativa);
    }
    return recurso;
  }

  public String obtenerNombreArchivo(String rutaRelativa) {
    return Paths.get(rutaRelativa).getFileName().toString();
  }

  private String obtenerExtension(String nombreOriginal) {
    if (nombreOriginal == null || !nombreOriginal.contains(".")) return "";
    return "." + nombreOriginal.substring(nombreOriginal.lastIndexOf('.') + 1)
        .toLowerCase().replaceAll("[^a-z0-9]", "");
  }
}
