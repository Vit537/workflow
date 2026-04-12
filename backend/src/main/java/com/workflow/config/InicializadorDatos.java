package com.workflow.config;

import com.workflow.iam.model.Rol;
import com.workflow.iam.model.User;
import com.workflow.iam.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class InicializadorDatos implements CommandLineRunner {

  private final UserRepository usuarioRepositorio;
  private final PasswordEncoder codificadorContrasena;

  public InicializadorDatos(UserRepository usuarioRepositorio,
      PasswordEncoder codificadorContrasena) {
    this.usuarioRepositorio = usuarioRepositorio;
    this.codificadorContrasena = codificadorContrasena;
  }

  @Override
  public void run(String... args) {
    if (!usuarioRepositorio.existsByCorreo("admin@workflow.com")) {
      User admin = User.builder()
          .nombre("Administrador")
          .correo("admin@workflow.com")
          .contrasena(codificadorContrasena.encode("admin123"))
          .rol(Rol.ADMIN)
          .activo(true)
          .build();
      usuarioRepositorio.save(admin);
      System.out.println(">> Usuario administrador creado: admin@workflow.com / admin123");
    }
  }
}
