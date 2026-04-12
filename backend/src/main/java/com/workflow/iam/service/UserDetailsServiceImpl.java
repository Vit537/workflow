package com.workflow.iam.service;

import com.workflow.iam.model.User;
import com.workflow.iam.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

  private final UserRepository userRepository;

  public UserDetailsServiceImpl(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public UserDetails loadUserByUsername(String correo) throws UsernameNotFoundException {
    return userRepository.findByCorreo(correo)
        .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + correo));
  }
}
