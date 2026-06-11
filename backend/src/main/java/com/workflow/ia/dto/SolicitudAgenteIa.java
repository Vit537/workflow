package com.workflow.ia.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.Map;

/**
 * Petición del frontend al agente IA. El backend inyecta las políticas publicadas
 * antes de llamar al microservicio de IA.
 */
public record SolicitudAgenteIa(
        @NotBlank(message = "El mensaje no puede estar vacío")
        String mensaje,
        // Historial opcional de la conversación: [{role, content}, ...]
        List<Map<String, String>> historial
) {}
