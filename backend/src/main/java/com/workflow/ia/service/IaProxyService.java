package com.workflow.ia.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
public class IaProxyService {

    private static final Logger log = LoggerFactory.getLogger(IaProxyService.class);

    private final RestTemplate restTemplate;

    @Value("${ia.service.url:http://localhost:8001}")
    private String iaServiceUrl;

    public IaProxyService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Map<?, ?> generarDiagrama(Map<?, ?> body) {
        String url = iaServiceUrl + "/api/ia/generar-diagrama";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<?, ?>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            log.error("Error del microservicio IA [{}]: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ResponseStatusException(e.getStatusCode(), "Error en el microservicio IA: " + e.getResponseBodyAsString());
        } catch (ResourceAccessException e) {
            log.error("Microservicio IA no disponible: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El microservicio IA no está disponible");
        }
    }
}
