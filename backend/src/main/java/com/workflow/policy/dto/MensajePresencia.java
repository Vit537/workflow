package com.workflow.policy.dto;

import lombok.Data;

@Data
public class MensajePresencia {

  private String tipo;          // ENTRO | SALIO
  private String politicaId;
  private String correo;
  private String nombre;
}
