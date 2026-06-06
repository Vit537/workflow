package com.workflow.document.dto;

import org.springframework.core.io.Resource;

/** Resultado de una descarga: el recurso binario más sus metadatos para los headers HTTP. */
public record ArchivoDescarga(Resource recurso, String nombreArchivo, String tipoMime) {}
