package com.workflow.ia.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SolicitudGenerarDiagrama(
        String prompt,
        DiagramaIA diagramaActual
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DiagramaIA(
            List<Object> carriles,
            List<Object> nodos,
            List<Object> conexiones
    ) {}
}
