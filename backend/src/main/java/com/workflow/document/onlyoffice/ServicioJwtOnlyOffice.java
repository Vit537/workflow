package com.workflow.document.onlyoffice;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Firma y verifica los JWT que se intercambian con OnlyOffice Document Server.
 *
 * <p>OnlyOffice exige que tanto la <b>config</b> que recibe el editor como el cuerpo del <b>callback</b>
 * vayan firmados con un secreto compartido (HS256). Este secreto ({@code app.onlyoffice.jwt-secret}) es
 * <b>distinto</b> al JWT de autenticación de la app.</p>
 *
 * <p>Si el secreto está vacío ({@link OnlyOfficeProperties#firmaActiva()} = false) la firma se omite
 * (modo desarrollo sin JWT en el contenedor).</p>
 */
@Service
@RequiredArgsConstructor
public class ServicioJwtOnlyOffice {

  private final OnlyOfficeProperties props;

  private SecretKey clave() {
    return Keys.hmacShaKeyFor(props.getJwtSecret().getBytes(StandardCharsets.UTF_8));
  }

  /**
   * Firma un payload (la config de OnlyOffice) como JWT compacto.
   * @return el token, o {@code null} si la firma está desactivada.
   */
  public String firmar(Map<String, Object> payload) {
    if (!props.firmaActiva()) return null;
    return Jwts.builder()
        .claims(payload)
        .signWith(clave())
        .compact();
  }

  /**
   * Verifica un token recibido (p. ej. el del cuerpo del callback) y devuelve sus claims.
   * @throws io.jsonwebtoken.JwtException si la firma es inválida.
   */
  public Claims verificar(String token) {
    return Jwts.parser()
        .verifyWith(clave())
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
