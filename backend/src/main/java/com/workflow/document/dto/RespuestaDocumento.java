package com.workflow.document.dto;

import com.workflow.document.model.EstadoDocumento;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RespuestaDocumento {
  private String id;
  private String politicaId;
  private String nodoId;
  private String tramiteId;
  private String nombre;
  private String descripcion;
  private EstadoDocumento estado;
  private String bloqueadoPor;
  private String bloqueadoPorNombre;
  private Instant bloqueadoEn;
  private int versionActual;
  private boolean editandoEnVivo;
  private String creadoPor;
  private String creadoPorNombre;
  private Instant creadoEn;
  private Instant actualizadoEn;

  /** {@code true} si el documento se puede editar en vivo (OnlyOffice activo + formato Office). */
  private boolean editableEnVivo;

  /** Tipo de editor de OnlyOffice ({@code word|cell|slide|pdf}) o null si no es soportado. */
  private String documentTypeOnlyOffice;

  /** Versión más reciente (para listados). */
  private RespuestaVersion ultimaVersion;

  /** Historial completo (solo en el detalle). */
  private List<RespuestaVersion> versiones;

  /** Comentarios (solo en el detalle). */
  private List<RespuestaComentario> comentarios;
}
