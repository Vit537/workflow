package com.workflow.document.onlyoffice;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Genera y valida un token corto firmado que se incrusta en las URLs que consume OnlyOffice
 * (descarga del contenido y callback). El Document Server no envía el JWT de autenticación de la app,
 * por eso estos endpoints van fuera del filtro JWT y se protegen con este token de un solo propósito.
 *
 * <p>El token ata el {@code documentoId} y tiene expiración ({@code app.onlyoffice.callback-token-ttl-min}).
 * Se firma con el mismo secreto de OnlyOffice; si la firma está desactivada se usa una clave derivada
 * estable para no dejar las URLs totalmente abiertas en desarrollo.</p>
 */
@Service
@RequiredArgsConstructor
public class TokenDescargaDocumento {

  private static final String CLAVE_DEV_FALLBACK =
      "oo-token-descarga-fallback-dev-no-usar-en-produccion-0123456789";

  private final OnlyOfficeProperties props;

  private SecretKey clave() {
    String secreto = props.firmaActiva() ? props.getJwtSecret() : CLAVE_DEV_FALLBACK;
    return Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
  }

  /** Genera un token corto ligado al documento, válido por {@code callbackTokenTtlMin} minutos. */
  public String generar(String documentoId) {
    long ttlMs = props.getCallbackTokenTtlMin() * 60_000L;
    return Jwts.builder()
        .subject(documentoId)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + ttlMs))
        .signWith(clave())
        .compact();
  }

  /** Valida que el token sea correcto, no esté expirado y corresponda al documento esperado. */
  public boolean esValido(String token, String documentoIdEsperado) {
    if (token == null || token.isBlank()) return false;
    try {
      Claims claims = Jwts.parser()
          .verifyWith(clave())
          .build()
          .parseSignedClaims(token)
          .getPayload();
      return documentoIdEsperado.equals(claims.getSubject());
    } catch (Exception e) {
      return false;
    }
  }
}
