package com.workflow.ia.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workflow.policy.model.EstadoPolitica;
import com.workflow.policy.model.Politica;
import com.workflow.policy.repository.PoliticaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Orquesta la consulta al agente IA: obtiene las políticas publicadas y las envía
 * (junto con el mensaje/audio e historial) al microservicio de IA, que recomienda
 * la política correcta y responde de forma conversacional.
 */
@Service
public class AgenteService {

    private static final Logger log = LoggerFactory.getLogger(AgenteService.class);

    private final RestTemplate restTemplate;
    private final PoliticaRepository politicaRepository;
    private final ObjectMapper objectMapper;

    @Value("${ia.service.url:http://localhost:8001}")
    private String iaServiceUrl;

    public AgenteService(RestTemplate restTemplate, PoliticaRepository politicaRepository,
                         ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.politicaRepository = politicaRepository;
        this.objectMapper = objectMapper;
    }

    /** Políticas publicadas en el formato que espera el microservicio IA. */
    private List<Map<String, String>> politicasPublicadas() {
        List<Map<String, String>> politicas = new ArrayList<>();
        for (Politica p : politicaRepository.findByEstado(EstadoPolitica.PUBLICADA)) {
            Map<String, String> item = new HashMap<>();
            item.put("id", p.getId());
            item.put("nombre", p.getNombre() != null ? p.getNombre() : "");
            item.put("descripcion", p.getDescripcion() != null ? p.getDescripcion() : "");
            politicas.add(item);
        }
        return politicas;
    }

    // ── Consulta por texto ─────────────────────────────────────────────────────

    public Map<?, ?> consultar(String mensaje, List<Map<String, String>> historial) {
        Map<String, Object> body = new HashMap<>();
        body.put("mensaje", mensaje);
        body.put("politicas", politicasPublicadas());
        body.put("historial", historial != null ? historial : List.of());

        String url = iaServiceUrl + "/api/ia/agente/consulta";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            log.error("Error del microservicio IA (agente) [{}]: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ResponseStatusException(e.getStatusCode(), "Error en el microservicio IA: " + e.getResponseBodyAsString());
        } catch (ResourceAccessException e) {
            log.error("Microservicio IA no disponible: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El microservicio IA no está disponible");
        }
    }

    // ── Consulta por voz (multipart) ───────────────────────────────────────────

    public Map<?, ?> consultarAudio(MultipartFile audio, String historialJson) {
        String url = iaServiceUrl + "/api/ia/agente/consulta-audio";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        try {
            String politicasJson = objectMapper.writeValueAsString(politicasPublicadas());

            LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("audio", new ByteArrayResource(audio.getBytes()) {
                @Override
                public String getFilename() {
                    return audio.getOriginalFilename() != null ? audio.getOriginalFilename() : "consulta.webm";
                }
            });
            body.add("politicas", politicasJson);
            body.add("historial", (historialJson != null && !historialJson.isBlank()) ? historialJson : "[]");

            HttpEntity<LinkedMultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return response.getBody();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer el archivo de audio");
        } catch (HttpClientErrorException e) {
            log.error("Error del microservicio IA (agente-audio) [{}]: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ResponseStatusException(e.getStatusCode(), "Error en el microservicio IA: " + e.getResponseBodyAsString());
        } catch (ResourceAccessException e) {
            log.error("Microservicio IA no disponible: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El microservicio IA no está disponible");
        }
    }
}
