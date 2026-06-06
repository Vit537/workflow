package com.workflow.iam.service;

import com.workflow.config.JwtUtil;
import com.workflow.iam.dto.RespuestaAuth;
import com.workflow.iam.dto.SolicitudLogin;
import com.workflow.iam.dto.SolicitudRegistro;
import com.workflow.iam.model.Rol;
import com.workflow.iam.model.User;
import com.workflow.iam.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class ServicioAuth {

  private final AuthenticationManager authenticationManager;
  private final JwtUtil jwtUtil;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public ServicioAuth(AuthenticationManager authenticationManager, JwtUtil jwtUtil,
      UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.authenticationManager = authenticationManager;
    this.jwtUtil = jwtUtil;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  public RespuestaAuth iniciarSesion(SolicitudLogin solicitud) {
    Authentication autenticacion = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(
            solicitud.getCorreo(),
            solicitud.getContrasena()
        )
    );

    User usuario = (User) autenticacion.getPrincipal();
    return construirRespuesta(usuario);
  }

  /** Registro de un cliente (rol CLIENTE). Devuelve el JWT para iniciar sesión de inmediato. */
  public RespuestaAuth registrarCliente(SolicitudRegistro solicitud) {
    if (userRepository.existsByCorreo(solicitud.getCorreo())) {
      throw new RuntimeException("Ya existe una cuenta con ese correo");
    }
    User cliente = User.builder()
        .nombre(solicitud.getNombre())
        .correo(solicitud.getCorreo())
        .contrasena(passwordEncoder.encode(solicitud.getContrasena()))
        .telefono(solicitud.getTelefono())
        .rol(Rol.CLIENTE)
        .activo(true)
        .build();
    return construirRespuesta(userRepository.save(cliente));
  }

  private RespuestaAuth construirRespuesta(User usuario) {
    String token = jwtUtil.generarToken(usuario, usuario.getRol().name());
    return RespuestaAuth.builder()
        .token(token)
        .id(usuario.getId())
        .nombre(usuario.getNombre())
        .correo(usuario.getCorreo())
        .rol(usuario.getRol())
        .build();
  }
}
