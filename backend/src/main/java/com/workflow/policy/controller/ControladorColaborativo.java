package com.workflow.policy.controller;

import com.workflow.policy.dto.MensajeColaborativo;
import com.workflow.policy.dto.MensajePresencia;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class ControladorColaborativo {

  /**
   * CU-10: Difunde cambios del diagrama a todos los admins
   * que tienen la misma política abierta.
   * Cliente publica en: /app/politicas/{id}/colaborar
   * Todos suscritos a:  /topic/politicas/{id}
   */
  @MessageMapping("/politicas/{id}/colaborar")
  @SendTo("/topic/politicas/{id}")
  public MensajeColaborativo difundirCambio(
      @DestinationVariable String id,
      MensajeColaborativo mensaje) {
    mensaje.setPoliticaId(id);
    return mensaje;
  }

  /**
   * CU-10: Difunde presencia (quién está editando).
   * Cliente publica en: /app/politicas/{id}/presencia
   * Todos suscritos a:  /topic/politicas/{id}/presencia
   */
  @MessageMapping("/politicas/{id}/presencia")
  @SendTo("/topic/politicas/{id}/presencia")
  public MensajePresencia difundirPresencia(
      @DestinationVariable String id,
      MensajePresencia mensaje) {
    mensaje.setPoliticaId(id);
    return mensaje;
  }
}
