package com.workflow.consulta.service;

import com.workflow.consulta.dto.RespuestaMensaje;
import com.workflow.consulta.model.Consulta;
import com.workflow.consulta.model.MensajeConsulta;
import com.workflow.consulta.model.TipoNotificacion;
import com.workflow.consulta.repository.ConsultaRepository;
import com.workflow.consulta.repository.MensajeConsultaRepository;
import com.workflow.iam.model.Rol;
import com.workflow.iam.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Mensajería entre el cliente y el asesor dentro de una consulta. Los mensajes se difunden en
 * tiempo real a {@code /topic/consultas/{id}/mensajes}.
 */
@Service
@RequiredArgsConstructor
public class ServicioMensaje {

  private final MensajeConsultaRepository mensajeRepository;
  private final ConsultaRepository consultaRepository;
  private final SimpMessagingTemplate messaging;
  private final ServicioNotificacionPersistente notificaciones;

  public List<RespuestaMensaje> listar(String consultaId, User usuario) {
    verificarAcceso(consultaId, usuario);
    List<MensajeConsulta> mensajes = mensajeRepository.findByConsultaIdOrderByFechaAsc(consultaId);
    // Marcar como leídos los mensajes escritos por la otra parte.
    mensajes.stream()
        .filter(m -> !m.isLeido() && !m.getAutorId().equals(usuario.getId()))
        .forEach(m -> { m.setLeido(true); mensajeRepository.save(m); });
    return mensajes.stream().map(this::mapear).toList();
  }

  public RespuestaMensaje enviar(String consultaId, String texto, User usuario) {
    Consulta consulta = verificarAcceso(consultaId, usuario);
    MensajeConsulta mensaje = MensajeConsulta.builder()
        .consultaId(consultaId)
        .autorId(usuario.getId())
        .autorNombre(usuario.getNombre())
        .autorRol(usuario.getRol())
        .texto(texto)
        .leido(false)
        .build();
    RespuestaMensaje resp = mapear(mensajeRepository.save(mensaje));
    messaging.convertAndSend("/topic/consultas/" + consultaId + "/mensajes", resp);

    // Notificar a la otra parte.
    String titulo = "Nuevo mensaje de " + usuario.getNombre();
    if (usuario.getRol() == Rol.CLIENTE) {
      notificaciones.crearParaCorreo(consulta.getAsesorCorreo(), titulo, texto,
          TipoNotificacion.NUEVO_MENSAJE, consultaId);
    } else {
      notificaciones.crearParaUsuario(consulta.getClienteId(), titulo, texto,
          TipoNotificacion.NUEVO_MENSAJE, consultaId);
    }
    return resp;
  }

  /** Un CLIENTE solo accede a su consulta; ASESOR/ADMIN acceden a todas. */
  private Consulta verificarAcceso(String consultaId, User usuario) {
    Consulta consulta = consultaRepository.findById(consultaId)
        .orElseThrow(() -> new RuntimeException("Consulta no encontrada: " + consultaId));
    if (usuario.getRol() == Rol.CLIENTE
        && (consulta.getClienteId() == null || !consulta.getClienteId().equals(usuario.getId()))) {
      throw new AccessDeniedException("Esta consulta no te pertenece");
    }
    return consulta;
  }

  private RespuestaMensaje mapear(MensajeConsulta m) {
    return RespuestaMensaje.builder()
        .id(m.getId())
        .consultaId(m.getConsultaId())
        .autorId(m.getAutorId())
        .autorNombre(m.getAutorNombre())
        .autorRol(m.getAutorRol())
        .texto(m.getTexto())
        .leido(m.isLeido())
        .fecha(m.getFecha())
        .build();
  }
}
