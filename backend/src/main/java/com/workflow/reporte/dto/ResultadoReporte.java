package com.workflow.reporte.dto;

import java.util.List;
import java.util.Map;

/**
 * Resultado final del reporte, listo para mostrar o exportar.
 */
public record ResultadoReporte(
        String titulo,
        String descripcion,
        List<String> columnas,
        List<Map<String, Object>> filas,
        boolean esKPI,
        String descripcionKPI,
        String promptTranscrito,
        int total
) {}
