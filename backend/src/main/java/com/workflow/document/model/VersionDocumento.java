package com.workflow.document.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Una versión inmutable de un documento. Embebida en {@code Documento.versiones}.
 * Nunca se modifica: cada subida crea una nueva versión con número incremental.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VersionDocumento {

  /** Número incremental de la versión (1, 2, 3, ...). */
  private int numero;

  /** Clave en el almacenamiento (local/S3) donde está el binario. */
  private String storageKey;

  /** Nombre original del archivo subido. */
  private String nombreArchivo;

  private String tipoMime;
  private long tamanoBytes;

  /** Quién subió esta versión (userId o "cliente"). */
  private String subidoPor;
  private String subidoPorNombre;

  private Instant subidoEn;

  /** Nota de cambio opcional ("qué cambió en esta versión"). */
  private String notaCambio;
}
