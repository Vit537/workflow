package com.workflow.policy.dto;

import com.workflow.policy.model.Carril;
import com.workflow.policy.model.Conexion;
import com.workflow.policy.model.Nodo;
import lombok.Data;

import java.util.List;

@Data
public class SolicitudActualizarDiagrama {

  private List<Carril> carriles;

  private List<Nodo> nodos;

  private List<Conexion> conexiones;
}
