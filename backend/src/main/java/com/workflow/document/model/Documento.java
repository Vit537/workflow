package com.workflow.document.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Documento del repositorio documental de una política.
 *
 * <p>El binario no se guarda aquí: cada versión apunta a una {@code storageKey} en el almacenamiento
 * (local o S3). Esta entidad mantiene los metadatos, el historial de versiones, los comentarios y el
 * estado de bloqueo (check-out) para la colaboración.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "documentos")
public class Documento {

  @Id
  private String id;

  /** Política dueña del repositorio (requerido). */
  @Indexed
  private String politicaId;

  /** Actividad/nodo asociada (opcional). */
  private String nodoId;

  /** Trámite asociado, si lo subió un cliente durante la ejecución (opcional). */
  private String tramiteId;

  private String nombre;
  private String descripcion;

  @Builder.Default
  private EstadoDocumento estado = EstadoDocumento.ACTIVO;

  /** Usuario que tiene el check-out (bloqueo suave) o null si está libre. */
  private String bloqueadoPor;
  private String bloqueadoPorNombre;
  private Instant bloqueadoEn;

  /** Hay una sesión de co-edición en vivo (OnlyOffice) abierta. Informativo para el front. */
  @Builder.Default
  private boolean editandoEnVivo = false;

  /** Número de la última versión (= versiones.size()). */
  @Builder.Default
  private int versionActual = 0;

  @Builder.Default
  private List<VersionDocumento> versiones = new ArrayList<>();

  @Builder.Default
  private List<ComentarioDocumento> comentarios = new ArrayList<>();

  private String creadoPor;
  private String creadoPorNombre;

  @CreatedDate
  private Instant creadoEn;

  @LastModifiedDate
  private Instant actualizadoEn;
}
