package com.workflow.ia.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.workflow.execution.model.EstadoPaso;
import com.workflow.execution.model.EstadoTramite;
import com.workflow.execution.model.PasoTramite;
import com.workflow.execution.model.Tramite;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Motor de enrutamiento y riesgo: proxy a los modelos del microservicio IA
 * (demora, ruta, prioridad, anomalía) + cálculo local del "nivel de atención"
 * a partir de la carga de trámites vs. asesores activos (disparador del agente).
 */
@Service
public class RiesgoService {

    private static final Logger log = LoggerFactory.getLogger(RiesgoService.class);

    private final RestTemplate restTemplate;
    private final MongoTemplate mongoTemplate;

    @Value("${ia.service.url:http://localhost:8001}")
    private String iaServiceUrl;

    public RiesgoService(RestTemplate restTemplate, MongoTemplate mongoTemplate) {
        this.restTemplate = restTemplate;
        this.mongoTemplate = mongoTemplate;
    }

    /** Reenvía la petición al endpoint correspondiente del microservicio IA. */
    public Map<?, ?> proxy(String recurso, Map<?, ?> body) {
        String url = iaServiceUrl + "/api/ia/riesgo/" + recurso;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<?, ?>> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            log.error("Error del microservicio IA (riesgo/{}) [{}]: {}", recurso, e.getStatusCode(), e.getResponseBodyAsString());
            throw new ResponseStatusException(e.getStatusCode(), "Error en el microservicio IA: " + e.getResponseBodyAsString());
        } catch (ResourceAccessException e) {
            log.error("Microservicio IA no disponible: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El microservicio IA no está disponible");
        }
    }

    /** GET al microservicio IA (para estado de entrenamiento, etc.). */
    public Map<?, ?> proxyGet(String recurso) {
        String url = iaServiceUrl + "/api/ia/riesgo/" + recurso;
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            throw new ResponseStatusException(e.getStatusCode(), "Error en el microservicio IA: " + e.getResponseBodyAsString());
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El microservicio IA no está disponible");
        }
    }

    /** Lanza el reentrenamiento de los modelos (en el microservicio IA). */
    public Map<?, ?> entrenar() {
        return proxy("entrenar", new HashMap<>());
    }

    /** Estado del entrenamiento. */
    public Map<?, ?> estadoEntrenamiento() {
        return proxyGet("entrenar/estado");
    }

    /**
     * Nivel de atención = trámites activos por asesor disponible.
     * Sirve para decidir si conviene ofrecer/activar la atención por IA.
     */
    public Map<String, Object> nivelAtencion() {
        long activos = mongoTemplate.count(
                Query.query(Criteria.where("estado").is("ACTIVO")), "tramites");
        long asesores = mongoTemplate.count(
                Query.query(Criteria.where("rol").is("ASESOR").and("activo").is(true)), "usuarios");

        double ratio = activos / (double) Math.max(1, asesores);
        String nivel = ratio >= 8 ? "ALTA" : ratio >= 4 ? "MEDIA" : "BAJA";
        boolean sugerirIA = !"BAJA".equals(nivel);

        Map<String, Object> r = new HashMap<>();
        r.put("tramitesActivos", activos);
        r.put("asesoresActivos", asesores);
        r.put("ratio", Math.round(ratio * 100.0) / 100.0);
        r.put("nivel", nivel);
        r.put("sugerirIA", sugerirIA);
        return r;
    }

    /**
     * Panel del administrador: para cada trámite ACTIVO toma su paso actual, arma el contexto
     * y pide al microservicio IA (batch) demora + prioridad + anomalía. Devuelve la cola
     * priorizada + el nivel de atención.
     */
    public Map<String, Object> panel() {
        Query q = Query.query(Criteria.where("estado").is(EstadoTramite.ACTIVO)).limit(100);
        List<Tramite> tramites = mongoTemplate.find(q, Tramite.class);
        Instant ahora = Instant.now();

        List<Map<String, Object>> items = new ArrayList<>();
        for (Tramite t : tramites) {
            List<PasoTramite> pasos = t.getPasos();
            if (pasos == null || pasos.isEmpty()) continue;

            int idx = -1;
            PasoTramite actual = null;
            for (int i = 0; i < pasos.size(); i++) {
                EstadoPaso e = pasos.get(i).getEstado();
                if (e == EstadoPaso.EN_PROGRESO || e == EstadoPaso.PENDIENTE) {
                    actual = pasos.get(i);
                    idx = i;
                    break;
                }
            }
            if (actual == null) continue;

            Instant ref = actual.getAsignadoEn() != null ? actual.getAsignadoEn() : t.getIniciadoEn();
            if (ref == null) ref = ahora;
            LocalDateTime ldt = LocalDateTime.ofInstant(ref, ZoneOffset.UTC);
            double horas = Math.max(0.0, (ahora.getEpochSecond() - ref.getEpochSecond()) / 3600.0);

            Map<String, Object> item = new HashMap<>();
            item.put("tramiteId", t.getId());
            item.put("nombrePolitica", t.getNombrePolitica() != null ? t.getNombrePolitica() : "");
            item.put("etiquetaNodo", actual.getEtiquetaNodo() != null ? actual.getEtiquetaNodo() : "");
            item.put("carrilNombre", actual.getCarrilNombre() != null ? actual.getCarrilNombre() : "");
            item.put("asignadoA", actual.getAsignadoA() != null ? actual.getAsignadoA() : "");
            item.put("nombreCliente", t.getIniciadoPor() != null ? t.getIniciadoPor() : "");
            item.put("horaInicio", ldt.getHour());
            item.put("diaSemana", ldt.getDayOfWeek().getValue() - 1); // lunes=0
            item.put("indicePaso", idx);
            item.put("antiguedadHoras", horas);
            item.put("duracionHoras", actual.getEstado() == EstadoPaso.EN_PROGRESO ? horas : 0.0);
            items.add(item);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("items", items);
        Map<?, ?> resp = proxy("panel", body);

        Map<String, Object> out = new HashMap<>();
        out.put("atencion", nivelAtencion());
        out.put("items", (resp != null && resp.get("items") != null) ? resp.get("items") : List.of());
        return out;
    }
}
