package com.workflow.policy.dto;

import com.workflow.policy.model.EstadoPolitica;

import java.time.Instant;

public interface PoliticaResumenProjection {
  String getId();

  String getNombre();

  String getDescripcion();

  EstadoPolitica getEstado();

  String getCreadoPor();

  Instant getCreadoEn();

  Instant getActualizadoEn();
}