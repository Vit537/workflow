package com.workflow.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;

/**
 * Almacenamiento en Amazon S3. Activa cuando {@code app.storage.type=s3}.
 *
 * <p>Las claves ({@code key}) son las mismas que usa {@link com.workflow.execution.service.ServicioArchivos}
 * ({@code <tramiteId>/<nodoId>/<campo>_<uuid>.<ext>}), de modo que el resto del sistema no cambia.</p>
 *
 * <p>Credenciales: se resuelven con el {@code DefaultCredentialsProvider} del AWS SDK
 * (rol de la task de ECS en producción, o variables {@code AWS_ACCESS_KEY_ID/SECRET} en local).
 * Nunca se ponen llaves embebidas en el código.</p>
 */
@Component
@ConditionalOnProperty(name = "app.storage.type", havingValue = "s3")
public class AlmacenamientoS3 implements AlmacenamientoArchivos {

  private final S3Client s3;
  private final String bucket;

  public AlmacenamientoS3(
      @Value("${app.storage.s3.bucket}") String bucket,
      @Value("${app.storage.s3.region:sa-east-1}") String region) {
    this.bucket = bucket;
    this.s3 = S3Client.builder().region(Region.of(region)).build();
  }

  @Override
  public String guardar(String key, MultipartFile archivo) throws IOException {
    s3.putObject(
        PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(archivo.getContentType())
            .build(),
        RequestBody.fromInputStream(archivo.getInputStream(), archivo.getSize()));
    return key;
  }

  @Override
  public String guardarBytes(String key, byte[] contenido) {
    s3.putObject(
        PutObjectRequest.builder().bucket(bucket).key(key).build(),
        RequestBody.fromBytes(contenido));
    return key;
  }

  @Override
  public Resource cargar(String key) {
    ResponseBytes<GetObjectResponse> bytes = s3.getObjectAsBytes(
        GetObjectRequest.builder().bucket(bucket).key(key).build());
    return new ByteArrayResource(bytes.asByteArray()) {
      @Override
      public String getFilename() {
        int barra = key.lastIndexOf('/');
        return barra >= 0 ? key.substring(barra + 1) : key;
      }
    };
  }

  @Override
  public void eliminar(String key) {
    s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
  }

  @Override
  public boolean existe(String key) {
    try {
      s3.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
      return true;
    } catch (NoSuchKeyException e) {
      return false;
    }
  }
}
