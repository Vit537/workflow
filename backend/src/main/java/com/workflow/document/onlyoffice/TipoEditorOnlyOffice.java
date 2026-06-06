package com.workflow.document.onlyoffice;

import java.util.Map;
import java.util.Set;

/**
 * Resuelve, a partir de la extensión de un archivo, qué tipo de editor de OnlyOffice le corresponde
 * ({@code word | cell | slide | pdf}) y si se puede <b>editar en vivo</b>.
 *
 * <p>Los formatos de Office se editan colaborativamente; el PDF solo se visualiza en línea.
 * Cualquier otra extensión (imágenes, zip, etc.) no es soportada por el editor → flujo normal de versiones.</p>
 */
public final class TipoEditorOnlyOffice {

  private TipoEditorOnlyOffice() {}

  /** documentType "word": editor de textos. */
  private static final Set<String> WORD =
      Set.of("docx", "doc", "odt", "rtf", "txt", "docm", "dotx", "ott", "fodt");
  /** documentType "cell": hojas de cálculo. */
  private static final Set<String> CELL =
      Set.of("xlsx", "xls", "ods", "csv", "xlsm", "xltx", "ots", "fods");
  /** documentType "slide": presentaciones. */
  private static final Set<String> SLIDE =
      Set.of("pptx", "ppt", "odp", "pptm", "potx", "otp", "fodp");
  /** Solo visualizable en línea (no editable en vivo). */
  private static final Set<String> PDF = Set.of("pdf");

  /** Extensión (en minúsculas, sin punto) a partir de un nombre de archivo; "" si no tiene. */
  public static String extension(String nombreArchivo) {
    if (nombreArchivo == null || !nombreArchivo.contains(".")) return "";
    return nombreArchivo.substring(nombreArchivo.lastIndexOf('.') + 1)
        .toLowerCase().replaceAll("[^a-z0-9]", "");
  }

  /** documentType de OnlyOffice para la extensión dada, o {@code null} si no es soportada. */
  public static String documentType(String nombreArchivo) {
    String ext = extension(nombreArchivo);
    if (WORD.contains(ext)) return "word";
    if (CELL.contains(ext)) return "cell";
    if (SLIDE.contains(ext)) return "slide";
    if (PDF.contains(ext)) return "pdf";
    return null;
  }

  /** {@code true} si el formato se puede editar colaborativamente (Office, no PDF ni otros). */
  public static boolean esEditable(String nombreArchivo) {
    String ext = extension(nombreArchivo);
    return WORD.contains(ext) || CELL.contains(ext) || SLIDE.contains(ext);
  }

  /** {@code true} si OnlyOffice puede al menos visualizarlo en línea (editable o PDF). */
  public static boolean esSoportado(String nombreArchivo) {
    return documentType(nombreArchivo) != null;
  }

  /** Mapa inmutable extensión→documentType (para diagnósticos/tests). */
  public static Map<String, String> soportados() {
    return Map.of("word", String.join(",", WORD), "cell", String.join(",", CELL),
        "slide", String.join(",", SLIDE), "pdf", String.join(",", PDF));
  }
}
