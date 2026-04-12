package com.workflow.iam.service;

import com.workflow.iam.dto.RespuestaUsuario;
import com.workflow.iam.dto.SolicitudActualizarUsuario;
import com.workflow.iam.dto.SolicitudCrearUsuario;
import com.workflow.iam.model.User;
import com.workflow.iam.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ServicioUsuario {

  private final UserRepository usuarioRepositorio;
  private final PasswordEncoder codificadorContrasena;

  public ServicioUsuario(UserRepository usuarioRepositorio, PasswordEncoder codificadorContrasena) {
    this.usuarioRepositorio = usuarioRepositorio;
    this.codificadorContrasena = codificadorContrasena;
  }

  public List<RespuestaUsuario> listarUsuarios() {
    return usuarioRepositorio.findAll()
        .stream()
        .map(this::mapearARespuesta)
        .collect(Collectors.toList());
  }

  public RespuestaUsuario obtenerUsuarioPorId(String id) {
    User usuario = buscarPorId(id);
    return mapearARespuesta(usuario);
  }

  public RespuestaUsuario crearUsuario(SolicitudCrearUsuario solicitud) {
    if (usuarioRepositorio.existsByCorreo(solicitud.getCorreo())) {
      throw new RuntimeException("Ya existe un usuario con el correo: " + solicitud.getCorreo());
    }

    User nuevoUsuario = User.builder()
        .nombre(solicitud.getNombre())
        .correo(solicitud.getCorreo())
        .contrasena(codificadorContrasena.encode(solicitud.getContrasena()))
        .rol(solicitud.getRol())
        .activo(true)
        .build();

    User guardado = usuarioRepositorio.save(nuevoUsuario);
    return mapearARespuesta(guardado);
  }

  public RespuestaUsuario actualizarUsuario(String id, SolicitudActualizarUsuario solicitud) {
    User usuario = buscarPorId(id);

    if (solicitud.getNombre() != null) {
      usuario.setNombre(solicitud.getNombre());
    }
    if (solicitud.getCorreo() != null) {
      if (!solicitud.getCorreo().equals(usuario.getCorreo())
          && usuarioRepositorio.existsByCorreo(solicitud.getCorreo())) {
        throw new RuntimeException("Ya existe un usuario con el correo: " + solicitud.getCorreo());
      }
      usuario.setCorreo(solicitud.getCorreo());
    }
    if (solicitud.getContrasena() != null) {
      usuario.setContrasena(codificadorContrasena.encode(solicitud.getContrasena()));
    }
    if (solicitud.getRol() != null) {
      usuario.setRol(solicitud.getRol());
    }
    if (solicitud.getActivo() != null) {
      usuario.setActivo(solicitud.getActivo());
    }

    User actualizado = usuarioRepositorio.save(usuario);
    return mapearARespuesta(actualizado);
  }

  public void desactivarUsuario(String id) {
    User usuario = buscarPorId(id);
    usuario.setActivo(false);
    usuarioRepositorio.save(usuario);
  }

  private User buscarPorId(String id) {
    return usuarioRepositorio.findById(id)
        .orElseThrow(() -> new RuntimeException("Usuario no encontrado con id: " + id));
  }

  private RespuestaUsuario mapearARespuesta(User usuario) {
    return RespuestaUsuario.builder()
        .id(usuario.getId())
        .nombre(usuario.getNombre())
        .correo(usuario.getCorreo())
        .rol(usuario.getRol())
        .activo(usuario.isActivo())
        .build();
  }
}
