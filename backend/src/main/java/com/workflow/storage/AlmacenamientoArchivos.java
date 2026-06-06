package com.workflow.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Abstracción del almacenamiento de archivos binarios.
 *
 * <p>Permite que el resto del sistema guarde y recupere archivos sin conocer si el respaldo
 * es el disco local o un bucket de AWS S3. Las claves ({@code key}) son rutas relativas
 * (separador {@code /}) que identifican unívocamente cada archivo dentro del almacenamiento.</p>
 *
 * <p>Implementaciones:</p>
 * <ul>
 *   <li>{@link AlmacenamientoLocal} — disco local (activa con {@code app.storage.type=local}).</li>
 *   <li>{@link AlmacenamientoS3} — Amazon S3 (activa con {@code app.storage.type=s3}). Implementado
 *       con AWS SDK v2 ({@code software.amazon.awssdk:s3}). El resto del código no cambia.</li>
 * </ul>
 */
public interface AlmacenamientoArchivos {

  /**
   * Guarda el contenido del archivo bajo la clave indicada.
   *
   * @param key     ruta relativa destino (ej. {@code politicas/p1/documentos/d1/v1_uuid.pdf})
   * @param archivo archivo recibido por multipart
   * @return la misma {@code key} con la que quedó almacenado
   */
  String guardar(String key, MultipartFile archivo) throws IOException;

  /**
   * Guarda contenido binario crudo bajo la clave indicada (p. ej. el archivo editado que devuelve
   * OnlyOffice por el callback, que no llega como {@link MultipartFile}).
   *
   * @param key       ruta relativa destino
   * @param contenido bytes a almacenar
   * @return la misma {@code key} con la que quedó almacenado
   */
  String guardarBytes(String key, byte[] contenido) throws IOException;

  /** Carga un archivo previamente almacenado como recurso descargable. */
  Resource cargar(String key) throws IOException;

  /** Elimina el archivo asociado a la clave (no falla si no existe). */
  void eliminar(String key) throws IOException;

  /** Indica si existe un archivo bajo la clave dada. */
  boolean existe(String key);
}
