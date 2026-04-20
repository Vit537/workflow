package com.workflow.ia.controller;

import com.workflow.ia.service.IaProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ia")
public class IaController {

    private final IaProxyService iaProxyService;

    public IaController(IaProxyService iaProxyService) {
        this.iaProxyService = iaProxyService;
    }

    @PostMapping("/generar-diagrama")
    public ResponseEntity<Map<?, ?>> generarDiagrama(@RequestBody Map<?, ?> body) {
        Map<?, ?> resultado = iaProxyService.generarDiagrama(body);
        return ResponseEntity.ok(resultado);
    }
}
