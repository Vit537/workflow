package com.workflow.document.service;

import com.workflow.document.model.RolDocumental;
import com.workflow.iam.model.Rol;
import com.workflow.iam.model.User;
import com.workflow.policy.model.Politica;
import com.workflow.policy.repository.PoliticaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/**
 * Resuelve el rol documental efectivo de un usuario sobre el repositorio de una política
 * y valida las operaciones según ese rol.
 *
 * <p>Reglas:</p>
 * <ul>
 *   <li>Un {@code ADMIN} del sistema y el creador de la política → PROPIETARIO.</li>
 *   <li>Un responsable explícito → el rol que tenga asignado.</li>
 *   <li>Cualquier otro usuario autenticado → LECTOR (puede ver y descargar).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class ServicioPermisosDocumento {

  private final PoliticaRepository politicaRepository;

  public RolDocumental rolEfectivo(String politicaId, User usuario) {
    Politica politica = politicaRepository.findById(politicaId)
        .orElseThrow(() -> new RuntimeException("Política no encontrada: " + politicaId));
    return rolEfectivo(politica, usuario);
  }

  public RolDocumental rolEfectivo(Politica politica, User usuario) {
    if (usuario == null) return RolDocumental.LECTOR;
    if (usuario.getRol() == Rol.ADMIN) return RolDocumental.PROPIETARIO;
    if (politica.getCreadoPor() != null
        && politica.getCreadoPor().equalsIgnoreCase(usuario.getCorreo())) {
      return RolDocumental.PROPIETARIO;
    }
    if (politica.getResponsables() != null) {
      return politica.getResponsables().stream()
          .filter(r -> (r.getUsuarioId() != null && r.getUsuarioId().equals(usuario.getId()))
              || (r.getCorreo() != null && r.getCorreo().equalsIgnoreCase(usuario.getCorreo())))
          .map(com.workflow.document.model.Responsable::getRolDocumental)
          .findFirst()
          .orElse(RolDocumental.LECTOR);
    }
    return RolDocumental.LECTOR;
  }

  public boolean puedeComentar(RolDocumental rol) {
    return rol == RolDocumental.COMENTARISTA || rol == RolDocumental.EDITOR || rol == RolDocumental.PROPIETARIO;
  }

  public boolean puedeEditar(RolDocumental rol) {
    return rol == RolDocumental.EDITOR || rol == RolDocumental.PROPIETARIO;
  }

  public boolean puedeGestionar(RolDocumental rol) {
    return rol == RolDocumental.PROPIETARIO;
  }

  // ── Validaciones (lanzan 403 si no cumple). actor==null = flujo público del cliente (se omite). ──

  public void exigirComentar(String politicaId, User actor) {
    if (actor == null) return;
    if (!puedeComentar(rolEfectivo(politicaId, actor))) {
      throw new AccessDeniedException("No tiene permiso para comentar este documento");
    }
  }

  public void exigirEditar(String politicaId, User actor) {
    if (actor == null) return;
    if (!puedeEditar(rolEfectivo(politicaId, actor))) {
      throw new AccessDeniedException("No tiene permiso para modificar este documento");
    }
  }

  public void exigirGestionar(String politicaId, User actor) {
    if (actor == null) return;
    if (!puedeGestionar(rolEfectivo(politicaId, actor))) {
      throw new AccessDeniedException("No tiene permiso para gestionar este documento");
    }
  }
}
