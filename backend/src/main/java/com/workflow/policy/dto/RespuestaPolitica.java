package com.workflow.policy.dto;

import com.workflow.document.model.Responsable;
import com.workflow.policy.model.Carril;
import com.workflow.policy.model.Conexion;
import com.workflow.policy.model.EstadoPolitica;
import com.workflow.policy.model.Nodo;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class RespuestaPolitica {

  private String id;
  private String nombre;
  private String descripcion;
  private EstadoPolitica estado;
  private String creadoPor;
  private List<Carril> carriles;
  private List<Nodo> nodos;
  private List<Conexion> conexiones;
  private List<Responsable> responsables;
  private Instant creadoEn;
  private Instant actualizadoEn;
}
