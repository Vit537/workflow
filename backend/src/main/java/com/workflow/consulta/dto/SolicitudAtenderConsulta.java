package com.workflow.consulta.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SolicitudAtenderConsulta {

  /**
   * Mensaje que el asesor envía al cliente describiendo qué debe hacer,
   * qué documentos necesita, pasos a seguir, etc.
   */
  @NotBlank(message = "El mensaje para el cliente es obligatorio")
  private String mensajeAsesor;

  /**
   * (Opcional) ID de la política a ejecutar como trámite para este cliente.
   * Si se proporciona, el sistema inicia un trámite automáticamente.
   */
  private String politicaId;
}
