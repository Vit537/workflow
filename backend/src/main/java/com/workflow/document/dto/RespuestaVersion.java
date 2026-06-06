package com.workflow.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RespuestaVersion {
  private int numero;
  private String nombreArchivo;
  private String tipoMime;
  private long tamanoBytes;
  private String subidoPor;
  private String subidoPorNombre;
  private Instant subidoEn;
  private String notaCambio;
}
