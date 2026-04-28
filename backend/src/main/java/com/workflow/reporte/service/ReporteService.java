package com.workflow.reporte.service;

import com.workflow.reporte.dto.RespuestaIaReporte;
import com.workflow.reporte.dto.ResultadoReporte;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReporteService {

    private static final Logger log = LoggerFactory.getLogger(ReporteService.class);
    private static final int MAX_FILAS = 500;

    private final RestTemplate restTemplate;
    private final MongoTemplate mongoTemplate;

    @Value("${ia.service.url:http://localhost:8001}")
    private String iaServiceUrl;

    public ReporteService(RestTemplate restTemplate, MongoTemplate mongoTemplate) {
        this.restTemplate = restTemplate;
        this.mongoTemplate = mongoTemplate;
    }

    // ── Generar reporte desde texto ──────────────────────────────────────────

    public ResultadoReporte generarDesdeTexto(String prompt) {
        RespuestaIaReporte iaResp = llamarIaTexto(prompt);
        return ejecutarPipeline(iaResp);
    }

    // ── Generar reporte desde audio (multipart) ───────────────────────────────

    public ResultadoReporte generarDesdeAudio(MultipartFile audio) {
        RespuestaIaReporte iaResp = llamarIaAudio(audio);
        return ejecutarPipeline(iaResp);
    }

    // ── Exportar a Excel ──────────────────────────────────────────────────────

    public ByteArrayResource exportarExcel(ResultadoReporte reporte) {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Reporte");

            // Estilo de cabecera
            CellStyle headerStyle = wb.createCellStyle();
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Fila de título
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(reporte.titulo());
            CellStyle titleStyle = wb.createCellStyle();
            Font titleFont = wb.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleCell.setCellStyle(titleStyle);

            // Fila de cabeceras (fila 2)
            Row headerRow = sheet.createRow(1);
            List<String> columnas = reporte.columnas();
            for (int i = 0; i < columnas.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columnas.get(i));
                cell.setCellStyle(headerStyle);
            }

            // Datos
            int rowIdx = 2;
            for (Map<String, Object> fila : reporte.filas()) {
                Row row = sheet.createRow(rowIdx++);
                for (int colIdx = 0; colIdx < columnas.size(); colIdx++) {
                    Object val = fila.get(columnas.get(colIdx));
                    Cell cell = row.createCell(colIdx);
                    if (val == null) {
                        cell.setCellValue("");
                    } else if (val instanceof Number n) {
                        cell.setCellValue(n.doubleValue());
                    } else if (val instanceof Boolean b) {
                        cell.setCellValue(b);
                    } else {
                        cell.setCellValue(val.toString());
                    }
                }
            }

            // Auto-size columns
            for (int i = 0; i < columnas.size(); i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return new ByteArrayResource(out.toByteArray());

        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al generar Excel: " + e.getMessage());
        }
    }

    // ── Privados ──────────────────────────────────────────────────────────────

    private RespuestaIaReporte llamarIaTexto(String prompt) {
        String url = iaServiceUrl + "/api/ia/generar-reporte";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> body = Map.of("prompt", prompt);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<RespuestaIaReporte> response =
                    restTemplate.postForEntity(url, request, RespuestaIaReporte.class);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            log.error("Error del microservicio IA [{}]: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ResponseStatusException(e.getStatusCode(), "Error en el microservicio IA: " + e.getResponseBodyAsString());
        } catch (ResourceAccessException e) {
            log.error("Microservicio IA no disponible: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El microservicio IA no está disponible");
        }
    }

    private RespuestaIaReporte llamarIaAudio(MultipartFile audio) {
        String url = iaServiceUrl + "/api/ia/generar-reporte-audio";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        try {
            org.springframework.util.LinkedMultiValueMap<String, Object> body =
                    new org.springframework.util.LinkedMultiValueMap<>();
            body.add("audio", new org.springframework.core.io.ByteArrayResource(audio.getBytes()) {
                @Override
                public String getFilename() {
                    return audio.getOriginalFilename() != null ? audio.getOriginalFilename() : "audio.webm";
                }
            });

            HttpEntity<org.springframework.util.LinkedMultiValueMap<String, Object>> request =
                    new HttpEntity<>(body, headers);
            ResponseEntity<RespuestaIaReporte> response =
                    restTemplate.postForEntity(url, request, RespuestaIaReporte.class);
            return response.getBody();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer el archivo de audio");
        } catch (HttpClientErrorException e) {
            log.error("Error del microservicio IA [{}]: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ResponseStatusException(e.getStatusCode(), "Error en el microservicio IA: " + e.getResponseBodyAsString());
        } catch (ResourceAccessException e) {
            log.error("Microservicio IA no disponible: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El microservicio IA no está disponible");
        }
    }

    private ResultadoReporte ejecutarPipeline(RespuestaIaReporte iaResp) {
        if (iaResp == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "El microservicio IA devolvió una respuesta vacía");
        }

        String coleccion = iaResp.coleccion() != null ? iaResp.coleccion() : "tramites";
        List<Map<String, Object>> pipeline = iaResp.pipeline() != null ? iaResp.pipeline() : List.of();

        // Convertir el pipeline a Documents de MongoDB
        List<Document> bsonPipeline = new ArrayList<>();
        for (Map<String, Object> etapa : pipeline) {
            bsonPipeline.add(new Document(etapa));
        }

        // Agregar $limit de seguridad si no existe
        boolean tieneLimit = bsonPipeline.stream().anyMatch(d -> d.containsKey("$limit"));
        if (!tieneLimit) {
            bsonPipeline.add(new Document("$limit", MAX_FILAS));
        }

        List<Map<String, Object>> filas;
        try {
            filas = mongoTemplate.getDb()
                    .getCollection(coleccion)
                    .aggregate(bsonPipeline)
                    .into(new ArrayList<>())
                    .stream()
                    .map(doc -> {
                        Map<String, Object> fila = new LinkedHashMap<>();
                        for (String key : doc.keySet()) {
                            if ("_id".equals(key)) {
                                fila.put("id", String.valueOf(doc.get(key)));
                            } else {
                                Object val = doc.get(key);
                                fila.put(key, serializarValor(val));
                            }
                        }
                        return fila;
                    })
                    .toList();
        } catch (Exception e) {
            log.error("Error ejecutando pipeline de reporte: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error al ejecutar la consulta generada: " + e.getMessage());
        }

        // Columnas: usar las del IA o inferirlas de la primera fila
        List<String> columnas = iaResp.columnas() != null && !iaResp.columnas().isEmpty()
                ? iaResp.columnas()
                : (filas.isEmpty() ? List.of() : new ArrayList<>(filas.get(0).keySet()));

        return new ResultadoReporte(
                iaResp.titulo() != null ? iaResp.titulo() : "Reporte",
                iaResp.descripcion() != null ? iaResp.descripcion() : "",
                columnas,
                filas,
                iaResp.promptTranscrito(),
                filas.size()
        );
    }

    private Object serializarValor(Object val) {
        if (val == null) return null;
        if (val instanceof Instant inst) return inst.toString();
        if (val instanceof org.bson.types.ObjectId oid) return oid.toHexString();
        if (val instanceof Document doc) return doc.toJson();
        if (val instanceof List<?> list) {
            return list.stream().map(this::serializarValor).toList();
        }
        return val;
    }
}
