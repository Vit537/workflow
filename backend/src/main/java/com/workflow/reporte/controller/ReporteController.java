package com.workflow.reporte.controller;

import com.workflow.reporte.dto.ResultadoReporte;
import com.workflow.reporte.dto.SolicitudReporte;
import com.workflow.reporte.service.ReporteService;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final ReporteService reporteService;

    public ReporteController(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    /**
     * Genera un reporte dinámico a partir de un prompt de texto.
     */
    @PostMapping("/generar")
    public ResponseEntity<ResultadoReporte> generarDesdeTexto(
            @Valid @RequestBody SolicitudReporte solicitud) {
        ResultadoReporte resultado = reporteService.generarDesdeTexto(solicitud.prompt());
        return ResponseEntity.ok(resultado);
    }

    /**
     * Genera un reporte dinámico a partir de un audio (multipart/form-data).
     */
    @PostMapping(value = "/generar-audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResultadoReporte> generarDesdeAudio(
            @RequestParam("audio") MultipartFile audio) {
        ResultadoReporte resultado = reporteService.generarDesdeAudio(audio);
        return ResponseEntity.ok(resultado);
    }

    /**
     * Exporta un reporte (ya generado) como archivo Excel.
     * El frontend envía el ResultadoReporte y recibe el archivo .xlsx.
     */
    @PostMapping("/exportar/excel")
    public ResponseEntity<ByteArrayResource> exportarExcel(
            @RequestBody ResultadoReporte reporte) {
        ByteArrayResource resource = reporteService.exportarExcel(reporte);
        String filename = "reporte_" + LocalDate.now() + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(resource);
    }

    /**
     * Exporta un reporte (ya generado) como archivo PDF.
     * El frontend envía el ResultadoReporte y recibe el archivo .pdf.
     */
    @PostMapping("/exportar/pdf")
    public ResponseEntity<ByteArrayResource> exportarPdf(
            @RequestBody ResultadoReporte reporte) {
        ByteArrayResource resource = reporteService.exportarPdf(reporte);
        String filename = "reporte_" + LocalDate.now() + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }
}
