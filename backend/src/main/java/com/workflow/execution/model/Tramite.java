package com.workflow.execution.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "tramites")
public class Tramite {

  @Id
  private String id;

  private String politicaId;
  private String nombrePolitica;
  private String iniciadoPor;

  private EstadoTramite estado;

  @Builder.Default
  private List<PasoTramite> pasos = new ArrayList<>();

  @CreatedDate
  private Instant iniciadoEn;

  private Instant finalizadoEn;
}
