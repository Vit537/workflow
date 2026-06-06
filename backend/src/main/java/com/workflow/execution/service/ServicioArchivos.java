package com.workflow.execution.service;

import com.workflow.storage.AlmacenamientoArchivos;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Maneja el almacenamiento de archivos subidos por los clientes durante un trámite.
 * Delega la persistencia física en {@link AlmacenamientoArchivos} (local o, en el futuro, S3),
 * de modo que esta clase solo se ocupa de construir la clave del archivo.
 *
 * Clave de almacenamiento: {@code <tramiteId>/<nodoId>/<campo>_<uuid>.<ext>}
 */
@Service
@RequiredArgsConstructor
public class ServicioArchivos {

  private final AlmacenamientoArchivos almacenamiento;

  /**
   * Guarda el archivo y devuelve la clave (ruta relativa) para almacenar en MongoDB.
   */
  public String guardarArchivo(String tramiteId, String nodoId, String campo,
      MultipartFile archivo) throws IOException {

    String extension = obtenerExtension(archivo.getOriginalFilename());
    String nombreArchivo = campo + "_" + UUID.randomUUID() + extension;
    String key = tramiteId + "/" + nodoId + "/" + nombreArchivo;
    return almacenamiento.guardar(key, archivo);
  }

  /**
   * Carga un archivo desde el almacenamiento como Resource descargable.
   */
  public Resource cargarArchivo(String rutaRelativa) throws IOException {
    return almacenamiento.cargar(rutaRelativa);
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
