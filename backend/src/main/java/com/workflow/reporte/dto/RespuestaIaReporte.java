package com.workflow.reporte.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;

/**
 * Respuesta del microservicio IA para generación de reportes.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RespuestaIaReporte(
        String titulo,
        String descripcion,
        String coleccion,
        List<Map<String, Object>> pipeline,
        List<String> columnas,
        Boolean esKPI,
        String descripcionKPI,
        String promptTranscrito
) {}
