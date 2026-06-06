package com.workflow.consulta.service;

import com.workflow.consulta.dto.RespuestaNotificacion;
import com.workflow.consulta.model.Notificacion;
import com.workflow.consulta.model.TipoNotificacion;
import com.workflow.consulta.repository.NotificacionRepository;
import com.workflow.iam.model.User;
import com.workflow.iam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Gestiona notificaciones persistentes (la "campanita"): crear, listar, marcar leídas y eliminar.
 * Se difunden en tiempo real a {@code /topic/usuarios/{usuarioId}/notificaciones}.
 */
@Service
@RequiredArgsConstructor
public class ServicioNotificacionPersistente {

  private final NotificacionRepository notificacionRepository;
  private final UserRepository userRepository;
  private final SimpMessagingTemplate messaging;

  // ── Crear ───────────────────────────────────────────────────────────────

  public void crearParaUsuario(String usuarioId, String titulo, String cuerpo,
      TipoNotificacion tipo, String referenciaId) {
    if (usuarioId == null) return;
    Notificacion n = notificacionRepository.save(Notificacion.builder()
        .usuarioId(usuarioId)
        .titulo(titulo)
        .cuerpo(cuerpo)
        .tipo(tipo)
        .referenciaId(referenciaId)
        .leida(false)
        .build());
    messaging.convertAndSend("/topic/usuarios/" + usuarioId + "/notificaciones", mapear(n));
  }

  /** Crea la notificación buscando al destinatario por su correo (p. ej. el asesor). */
  public void crearParaCorreo(String correo, String titulo, String cuerpo,
      TipoNotificacion tipo, String referenciaId) {
    if (correo == null) return;
    userRepository.findByCorreo(correo)
        .ifPresent(u -> crearParaUsuario(u.getId(), titulo, cuerpo, tipo, referenciaId));
  }

  // ── Consultar / actualizar ────────────────────────────────────────────────

  public List<RespuestaNotificacion> listar(User usuario) {
    return notificacionRepository.findByUsuarioIdOrderByCreadaEnDesc(usuario.getId())
        .stream().map(this::mapear).toList();
  }

  public RespuestaNotificacion marcarLeida(String id, User usuario) {
    Notificacion n = buscarPropia(id, usuario);
    n.setLeida(true);
    return mapear(notificacionRepository.save(n));
  }

  public void marcarTodasLeidas(User usuario) {
    var pendientes = notificacionRepository.findByUsuarioIdAndLeidaFalse(usuario.getId());
    pendientes.forEach(n -> n.setLeida(true));
    notificacionRepository.saveAll(pendientes);
  }

  public void eliminar(String id, User usuario) {
    notificacionRepository.delete(buscarPropia(id, usuario));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private Notificacion buscarPropia(String id, User usuario) {
    Notificacion n = notificacionRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Notificación no encontrada: " + id));
    if (!n.getUsuarioId().equals(usuario.getId())) {
      throw new AccessDeniedException("Esta notificación no te pertenece");
    }
    return n;
  }

  private RespuestaNotificacion mapear(Notificacion n) {
    return RespuestaNotificacion.builder()
        .id(n.getId())
        .titulo(n.getTitulo())
        .cuerpo(n.getCuerpo())
        .tipo(n.getTipo())
        .referenciaId(n.getReferenciaId())
        .leida(n.isLeida())
        .creadaEn(n.getCreadaEn())
        .build();
  }
}
