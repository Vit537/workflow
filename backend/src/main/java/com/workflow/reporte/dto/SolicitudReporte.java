package com.workflow.reporte.dto;

import jakarta.validation.constraints.NotBlank;

public record SolicitudReporte(
        @NotBlank(message = "El prompt no puede estar vacío")
        String prompt
) {}
