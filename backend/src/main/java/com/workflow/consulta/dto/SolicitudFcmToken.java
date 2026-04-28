package com.workflow.consulta.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SolicitudFcmToken {

  @NotBlank(message = "El token FCM es obligatorio")
  private String fcmToken;
}
