package com.workflow.document.onlyoffice.dto;

import java.util.Map;

/**
 * Respuesta del endpoint de configuración del editor en vivo.
 *
 * @param config       config que espera {@code DocsAPI.DocEditor} (document, documentType, editorConfig, token).
 *                     Se entrega como mapa porque OnlyOffice lo consume como JSON tal cual y el {@code token}
 *                     firma exactamente este contenido.
 * @param publicUrl    URL pública del Document Server desde donde el navegador carga {@code api.js}.
 * @param editable     {@code true} si el usuario abre en modo edición; {@code false} si solo lectura.
 * @param documentType tipo de editor de OnlyOffice ({@code word|cell|slide|pdf}).
 */
public record RespuestaConfigOnlyOffice(
    Map<String, Object> config,
    String publicUrl,
    boolean editable,
    String documentType) {}
