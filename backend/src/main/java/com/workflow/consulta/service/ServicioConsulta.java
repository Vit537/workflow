package com.workflow.consulta.service;

import com.workflow.consulta.dto.RespuestaConsulta;
import com.workflow.consulta.dto.RespuestaConsultaCliente;
import com.workflow.consulta.dto.RespuestaVerificacionConsulta;
import com.workflow.consulta.dto.SolicitudAtenderConsulta;
import com.workflow.consulta.dto.SolicitudCrearConsulta;
import com.workflow.consulta.model.Consulta;
import com.workflow.consulta.model.EstadoConsulta;
import com.workflow.consulta.repository.ConsultaRepository;
import com.workflow.execution.dto.SolicitudCrearTramite;
import com.workflow.execution.service.ServicioTramite;
import com.workflow.iam.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServicioConsulta {

  private final ConsultaRepository consultaRepository;
  private final ServicioTramite servicioTramite;
  private final ServicioNotificacion servicioNotificacion;
  private final ServicioNotificacionPersistente notificacionesPersistentes;

  // ── CU: Crear consulta (cliente) ──────────────────────────────────────

  /** Crea una consulta ligada al cliente autenticado (los datos de contacto salen de su cuenta). */
  public RespuestaConsulta crearConsulta(SolicitudCrearConsulta solicitud, User cliente) {
    Consulta consulta = Consulta.builder()
        .clienteId(cliente.getId())
        .clienteNombre(cliente.getNombre())
        .clienteCorreo(cliente.getCorreo())
        .clienteTelefono(cliente.getTelefono() != null ? cliente.getTelefono() : solicitud.getClienteTelefono())
        .descripcion(solicitud.getDescripcion())
        .estado(EstadoConsulta.PENDIENTE)
        .creadaEn(Instant.now())
        .build();
    return mapear(consultaRepository.save(consulta));
  }

  /** Lista las consultas del cliente autenticado. */
  public List<RespuestaConsulta> listarMisConsultas(User cliente) {
    return consultaRepository.findByClienteIdOrderByCreadaEnDesc(cliente.getId())
        .stream().map(this::mapear).collect(Collectors.toList());
  }

  /** Detalle de una consulta del cliente con el progreso del trámite (valida propiedad). */
  public RespuestaConsultaCliente obtenerMiConsulta(String consultaId, User cliente) {
    Consulta consulta = buscarPorId(consultaId);
    if (consulta.getClienteId() == null || !consulta.getClienteId().equals(cliente.getId())) {
      throw new AccessDeniedException("Esta consulta no te pertenece");
    }

    com.workflow.execution.dto.RespuestaTramite tramite = null;
    if (consulta.getTramiteId() != null) {
      try {
        tramite = servicioTramite.obtenerTramite(consulta.getTramiteId());
      } catch (RuntimeException ignored) { /* trámite eliminado */ }
    }

    return RespuestaConsultaCliente.builder()
        .id(consulta.getId())
        .descripcion(consulta.getDescripcion())
        .estado(consulta.getEstado())
        .asesorCorreo(consulta.getAsesorCorreo())
        .mensajeAsesor(consulta.getMensajeAsesor())
        .tramiteId(consulta.getTramiteId())
        .creadaEn(consulta.getCreadaEn())
        .atendidaEn(consulta.getAtendidaEn())
        .tramite(tramite)
        .build();
  }

  // ── Registrar FCM token del cliente ───────────────────────────────────

  public RespuestaConsulta registrarFcmToken(String consultaId, String fcmToken) {
    Consulta consulta = buscarPorId(consultaId);
    consulta.setFcmToken(fcmToken);
    return mapear(consultaRepository.save(consulta));
  }

  // ── Listar / obtener (asesor / admin) ─────────────────────────────────

  public List<RespuestaConsulta> listarConsultas(EstadoConsulta estado) {
    if (estado != null) {
      return consultaRepository.findByEstadoOrderByCreadaEnDesc(estado)
          .stream().map(this::mapear).collect(Collectors.toList());
    }
    return consultaRepository.findAllByOrderByCreadaEnDesc()
        .stream().map(this::mapear).collect(Collectors.toList());
  }

  public RespuestaConsulta obtenerConsulta(String id) {
    return mapear(buscarPorId(id));
  }

  /** Consulta pública de estado (solo para el cliente con su ID) */
  public RespuestaConsulta estadoConsulta(String id) {
    return mapear(buscarPorId(id));
  }

  // ── Atender consulta (asesor) ─────────────────────────────────────────

  public RespuestaConsulta atenderConsulta(String consultaId,
      SolicitudAtenderConsulta solicitud, String asesorCorreo) {

    Consulta consulta = buscarPorId(consultaId);

    consulta.setEstado(EstadoConsulta.EN_ATENCION);
    consulta.setAsesorCorreo(asesorCorreo);
    consulta.setMensajeAsesor(solicitud.getMensajeAsesor());
    consulta.setAtendidaEn(Instant.now());

    // Si el asesor vinculó una política y la consulta aún no tiene trámite, iniciarlo
    if (solicitud.getPoliticaId() != null && !solicitud.getPoliticaId().isBlank()
        && (consulta.getTramiteId() == null || consulta.getTramiteId().isBlank())) {
      SolicitudCrearTramite solTramite = new SolicitudCrearTramite();
      solTramite.setPoliticaId(solicitud.getPoliticaId());
      solTramite.setConsultaId(consulta.getId());   // enlace bidireccional
      try {
        String tramiteId = servicioTramite.crearTramite(solTramite, asesorCorreo).getId();
        consulta.setTramiteId(tramiteId);
      } catch (RuntimeException e) {
        throw new RuntimeException("No se pudo iniciar el trámite: " + e.getMessage());
      }
    }

    consultaRepository.save(consulta);

    // Enviar notificación push al cliente (móvil) + persistir (campanita web/móvil)
    String titulo = "Respuesta a tu consulta";
    String cuerpo = solicitud.getMensajeAsesor();
    servicioNotificacion.enviarNotificacion(
        consulta.getFcmToken(), titulo, cuerpo,
        Map.of("consultaId", consultaId,
               "tipo", "ATENCION",
               "tramiteId", consulta.getTramiteId() != null ? consulta.getTramiteId() : ""));
    notificacionesPersistentes.crearParaUsuario(consulta.getClienteId(), titulo, cuerpo,
        com.workflow.consulta.model.TipoNotificacion.CONSULTA_ATENDIDA, consultaId);

    return mapear(consulta);
  }

  // ── Completar consulta (asesor) ───────────────────────────────────────

  public RespuestaConsulta completarConsulta(String consultaId, String asesorCorreo) {
    Consulta consulta = buscarPorId(consultaId);

    if (consulta.getEstado() == EstadoConsulta.COMPLETADA) {
      throw new RuntimeException("La consulta ya está completada");
    }

    consulta.setEstado(EstadoConsulta.COMPLETADA);
    consultaRepository.save(consulta);

    String titulo = "Tu consulta fue resuelta";
    String cuerpo = "Tu trámite ha sido procesado exitosamente. ¡Gracias por contactarnos!";
    servicioNotificacion.enviarNotificacion(
        consulta.getFcmToken(), titulo, cuerpo,
        Map.of("consultaId", consultaId, "tipo", "COMPLETADA"));
    notificacionesPersistentes.crearParaUsuario(consulta.getClienteId(), titulo, cuerpo,
        com.workflow.consulta.model.TipoNotificacion.CONSULTA_COMPLETADA, consultaId);

    return mapear(consulta);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  // ── Verificar consulta por correo + descripción (asesor) ─────────────

  /**
   * Doble verificación:
   * 1. Busca la consulta más reciente del correo indicado.
   * 2. Comprueba si la descripción proporcionada está contenida (ignora mayúsculas).
   * Retorna la consulta con el progreso del trámite vinculado (si existe).
   */
  public RespuestaVerificacionConsulta verificarConsulta(String correo, String descripcion) {
    // Usa findTop (indexed) en lugar de cargar toda la lista y tomar get(0)
    Consulta consulta = consultaRepository
        .findTopByClienteCorreoOrderByCreadaEnDesc(correo)
        .orElseThrow(() -> new RuntimeException("No se encontraron consultas para el correo: " + correo));

    boolean coincide = descripcion == null
        || consulta.getDescripcion().toLowerCase().contains(descripcion.toLowerCase())
        || descripcion.toLowerCase().contains(consulta.getDescripcion().toLowerCase().substring(0, Math.min(10, consulta.getDescripcion().length())));

    com.workflow.execution.dto.RespuestaTramite tramiteResp = null;
    if (consulta.getTramiteId() != null) {
      try {
        tramiteResp = servicioTramite.obtenerTramite(consulta.getTramiteId());
      } catch (RuntimeException ignored) {
        // El trámite pudo haberse eliminado; lo ignoramos
      }
    }

    return RespuestaVerificacionConsulta.builder()
        .consultaId(consulta.getId())
        .clienteNombre(consulta.getClienteNombre())
        .clienteCorreo(consulta.getClienteCorreo())
        .clienteTelefono(consulta.getClienteTelefono())
        .descripcion(consulta.getDescripcion())
        .estadoConsulta(consulta.getEstado())
        .asesorCorreo(consulta.getAsesorCorreo())
        .mensajeAsesor(consulta.getMensajeAsesor())
        .creadaEn(consulta.getCreadaEn())
        .atendidaEn(consulta.getAtendidaEn())
        .tramite(tramiteResp)
        .descripcionCoincide(coincide)
        .build();
  }

  private Consulta buscarPorId(String id) {
    return consultaRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Consulta no encontrada con id: " + id));
  }

  private RespuestaConsulta mapear(Consulta c) {
    return RespuestaConsulta.builder()
        .id(c.getId())
        .clienteNombre(c.getClienteNombre())
        .clienteCorreo(c.getClienteCorreo())
        .clienteTelefono(c.getClienteTelefono())
        .descripcion(c.getDescripcion())
        .estado(c.getEstado())
        .asesorCorreo(c.getAsesorCorreo())
        .tramiteId(c.getTramiteId())
        .mensajeAsesor(c.getMensajeAsesor())
        .creadaEn(c.getCreadaEn())
        .atendidaEn(c.getAtendidaEn())
        .build();
  }
}
