package com.workflow.document.service;

import com.workflow.document.dto.RespuestaLogDocumento;
import com.workflow.document.model.AccionDocumento;
import com.workflow.document.model.LogDocumento;
import com.workflow.document.repository.LogDocumentoRepository;
import com.workflow.iam.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Auditoría de documentos: registra quién ve / descarga / modifica y permite consultarlo.
 */
@Service
@RequiredArgsConstructor
public class ServicioLogDocumento {

  private final LogDocumentoRepository logRepository;

  public void registrar(String documentoId, String politicaId, User actor,
      AccionDocumento accion, Integer versionNumero, String detalle) {
    logRepository.save(LogDocumento.builder()
        .documentoId(documentoId)
        .politicaId(politicaId)
        .usuarioId(actor != null ? actor.getId() : "cliente")
        .usuarioCorreo(actor != null ? actor.getCorreo() : "cliente")
        .accion(accion)
        .versionNumero(versionNumero)
        .detalle(detalle)
        .build());
  }

  public List<RespuestaLogDocumento> porDocumento(String documentoId) {
    return logRepository.findByDocumentoIdOrderByFechaDesc(documentoId)
        .stream().map(this::mapear).toList();
  }

  public List<RespuestaLogDocumento> porPolitica(String politicaId) {
    return logRepository.findByPoliticaIdOrderByFechaDesc(politicaId)
        .stream().map(this::mapear).toList();
  }

  private RespuestaLogDocumento mapear(LogDocumento l) {
    return RespuestaLogDocumento.builder()
        .id(l.getId())
        .documentoId(l.getDocumentoId())
        .politicaId(l.getPoliticaId())
        .usuarioId(l.getUsuarioId())
        .usuarioCorreo(l.getUsuarioCorreo())
        .accion(l.getAccion())
        .versionNumero(l.getVersionNumero())
        .detalle(l.getDetalle())
        .fecha(l.getFecha())
        .build();
  }
}
