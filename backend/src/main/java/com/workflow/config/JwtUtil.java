package com.workflow.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {

  @Value("${app.jwt.secret}")
  private String secret;

  @Value("${app.jwt.expiration-ms}")
  private long expirationMs;

  private SecretKey getSigningKey() {
    return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }

  public String generarToken(UserDetails userDetails, String rol) {
    Map<String, Object> claims = new HashMap<>();
    claims.put("rol", rol);
    if (userDetails instanceof com.workflow.iam.model.User u) {
      claims.put("id", u.getId());
      claims.put("nombre", u.getNombre());
    }
    return Jwts.builder()
        .claims(claims)
        .subject(userDetails.getUsername())
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + expirationMs))
        .signWith(getSigningKey())
        .compact();
  }

  public String extraerUsuario(String token) {
    return extraerClaim(token, Claims::getSubject);
  }

  public String extraerRol(String token) {
    return extraerClaim(token, claims -> claims.get("rol", String.class));
  }

  public boolean validarToken(String token, UserDetails userDetails) {
    String usuario = extraerUsuario(token);
    return usuario.equals(userDetails.getUsername()) && !tokenExpirado(token);
  }

  private boolean tokenExpirado(String token) {
    return extraerClaim(token, Claims::getExpiration).before(new Date());
  }

  private <T> T extraerClaim(String token, Function<Claims, T> resolvedor) {
    Claims claims = Jwts.parser()
        .verifyWith(getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();
    return resolvedor.apply(claims);
  }
}
