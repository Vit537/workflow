package com.workflow.ia.controller;

import com.workflow.ia.service.RiesgoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Motor de enrutamiento y riesgo (proxy a los modelos IA) + nivel de atención.
 */
@RestController
@RequestMapping("/api/riesgo")
public class RiesgoController {

    private final RiesgoService riesgoService;

    public RiesgoController(RiesgoService riesgoService) {
        this.riesgoService = riesgoService;
    }

    @PostMapping("/demora")
    public ResponseEntity<Map<?, ?>> demora(@RequestBody Map<?, ?> body) {
        return ResponseEntity.ok(riesgoService.proxy("demora", body));
    }

    @PostMapping("/ruta")
    public ResponseEntity<Map<?, ?>> ruta(@RequestBody Map<?, ?> body) {
        return ResponseEntity.ok(riesgoService.proxy("ruta", body));
    }

    @PostMapping("/prioridad")
    public ResponseEntity<Map<?, ?>> prioridad(@RequestBody Map<?, ?> body) {
        return ResponseEntity.ok(riesgoService.proxy("prioridad", body));
    }

    @PostMapping("/anomalia")
    public ResponseEntity<Map<?, ?>> anomalia(@RequestBody Map<?, ?> body) {
        return ResponseEntity.ok(riesgoService.proxy("anomalia", body));
    }

    /** Disparador de "atención elevada" para decidir si ofrecer el agente IA. */
    @GetMapping("/atencion")
    public ResponseEntity<Map<String, Object>> atencion() {
        return ResponseEntity.ok(riesgoService.nivelAtencion());
    }

    /** Panel del administrador: cola priorizada (demora/prioridad/anomalía) + nivel de atención. */
    @GetMapping("/panel")
    public ResponseEntity<Map<String, Object>> panel() {
        return ResponseEntity.ok(riesgoService.panel());
    }

    /** Reentrena los modelos TensorFlow (admin). Corre en background en el microservicio IA. */
    @PostMapping("/entrenar")
    public ResponseEntity<Map<?, ?>> entrenar() {
        return ResponseEntity.ok(riesgoService.entrenar());
    }

    /** Estado del entrenamiento (admin). */
    @GetMapping("/entrenar/estado")
    public ResponseEntity<Map<?, ?>> estadoEntrenamiento() {
        return ResponseEntity.ok(riesgoService.estadoEntrenamiento());
    }
}
