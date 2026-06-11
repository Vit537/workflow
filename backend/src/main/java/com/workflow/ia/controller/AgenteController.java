package com.workflow.ia.controller;

import com.workflow.ia.dto.SolicitudAgenteIa;
import com.workflow.ia.service.AgenteService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Endpoint del agente automatizado de atención al cliente (IA).
 */
@RestController
@RequestMapping("/api/agente")
public class AgenteController {

    private final AgenteService agenteService;

    public AgenteController(AgenteService agenteService) {
        this.agenteService = agenteService;
    }

    @PostMapping("/consulta")
    public ResponseEntity<Map<?, ?>> consulta(@Valid @RequestBody SolicitudAgenteIa solicitud) {
        return ResponseEntity.ok(agenteService.consultar(solicitud.mensaje(), solicitud.historial()));
    }

    /** Consulta del agente por voz: el cliente envía audio y (opcional) el historial. */
    @PostMapping(value = "/consulta-audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<?, ?>> consultaAudio(
            @RequestParam("audio") MultipartFile audio,
            @RequestParam(value = "historial", required = false) String historial) {
        return ResponseEntity.ok(agenteService.consultarAudio(audio, historial));
    }
}
