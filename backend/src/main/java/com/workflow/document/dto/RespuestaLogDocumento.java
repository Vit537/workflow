package com.workflow.document.dto;

import com.workflow.document.model.AccionDocumento;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RespuestaLogDocumento {
  private String id;
  private String documentoId;
  private String politicaId;
  private String usuarioId;
  private String usuarioCorreo;
  private AccionDocumento accion;
  private Integer versionNumero;
  private String detalle;
  private Instant fecha;
}
