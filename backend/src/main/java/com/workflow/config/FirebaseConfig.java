package com.workflow.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;

@Slf4j
@Configuration
public class FirebaseConfig {

  @PostConstruct
  public void inicializar() {
    if (!FirebaseApp.getApps().isEmpty()) {
      return;
    }
    try {
      ClassPathResource credenciales = new ClassPathResource("firebase-adminsdk.json");
      FirebaseOptions opciones = FirebaseOptions.builder()
          .setCredentials(GoogleCredentials.fromStream(credenciales.getInputStream()))
          .build();
      FirebaseApp.initializeApp(opciones);
      log.info("Firebase Admin SDK inicializado correctamente");
    } catch (IOException e) {
      log.error("No se pudo inicializar Firebase Admin SDK (no fatal): {}", e.getMessage());
    }
  }
}
