package com.workflow.document.controller;

import com.workflow.document.dto.MensajePresenciaDocumento;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

/**
 * Colaboración en tiempo real sobre documentos.
 *
 * <p>Presencia (quién está viendo/editando): el cliente publica en
 * {@code /app/documentos/{id}/presencia} y todos los suscriptores a
 * {@code /topic/documentos/{id}/presencia} la reciben.</p>
 *
 * <p>Los eventos de cambio (nueva versión, comentario, bloqueo) se difunden desde el servicio
 * a {@code /topic/documentos/{id}} vía {@code SimpMessagingTemplate}.</p>
 */
@Controller
public class ControladorColaborativoDocumento {

  @MessageMapping("/documentos/{id}/presencia")
  @SendTo("/topic/documentos/{id}/presencia")
  public MensajePresenciaDocumento difundirPresencia(
      @DestinationVariable String id,
      MensajePresenciaDocumento mensaje) {
    mensaje.setDocumentoId(id);
    return mensaje;
  }
}
