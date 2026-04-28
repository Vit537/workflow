package com.workflow.consulta.service;

import com.google.api.core.ApiFutures;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
public class ServicioNotificacion {

  /**
   * Envía una notificación push al dispositivo del cliente vía Firebase Cloud Messaging.
   * Usa sendAsync() para no bloquear el hilo HTTP — fire-and-forget.
   */
  public void enviarNotificacion(String fcmToken, String titulo, String cuerpo,
      Map<String, String> datos) {

    if (fcmToken == null || fcmToken.isBlank()) {
      log.warn("No se puede enviar notificación: el cliente no tiene FCM token registrado");
      return;
    }

    Message.Builder builder = Message.builder()
        .setToken(fcmToken)
        .setNotification(Notification.builder()
            .setTitle(titulo)
            .setBody(cuerpo)
            .build());

    if (datos != null && !datos.isEmpty()) {
      builder.putAllData(datos);
    }

    // sendAsync() usa el pool interno del SDK — no bloquea el hilo HTTP en absoluto
    try {
      var futuro = FirebaseMessaging.getInstance().sendAsync(builder.build());
      ApiFutures.addCallback(futuro, new com.google.api.core.ApiFutureCallback<>() {
        @Override
        public void onSuccess(String messageId) {
          log.info("Notificación FCM enviada. MessageId: {}", messageId);
        }
        @Override
        public void onFailure(Throwable t) {
          log.error("Error al enviar notificación FCM: {}", t.getMessage());
        }
      }, Runnable::run);
    } catch (Exception e) {
      log.warn("Firebase no está disponible, notificación push omitida: {}", e.getMessage());
    }
  }
}
