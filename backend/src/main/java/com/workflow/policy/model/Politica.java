package com.workflow.policy.model;

import com.workflow.document.model.Responsable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "politicas")
public class Politica {

  @Id
  private String id;

  private String nombre;

  private String descripcion;

  private EstadoPolitica estado;

  private String creadoPor;

  @Builder.Default
  private List<Carril> carriles = new ArrayList<>();

  @Builder.Default
  private List<Nodo> nodos = new ArrayList<>();

  @Builder.Default
  private List<Conexion> conexiones = new ArrayList<>();

  /** Responsables del repositorio documental de esta política y su rol documental. */
  @Builder.Default
  private List<Responsable> responsables = new ArrayList<>();

  @CreatedDate
  private Instant creadoEn;

  @LastModifiedDate
  private Instant actualizadoEn;
}
