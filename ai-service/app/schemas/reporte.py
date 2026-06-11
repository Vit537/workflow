"""Schemas Pydantic del módulo de reportes dinámicos (CU-15)."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SolicitudGenerarReporte(BaseModel):
    prompt: str = Field(
        ..., min_length=5, description="Descripción del reporte deseado en lenguaje natural"
    )


class RespuestaGenerarReporte(BaseModel):
    titulo: str
    descripcion: str
    coleccion: str
    pipeline: list[dict]
    columnas: list[str]
    esKPI: bool = False                       # True si el reporte es de indicadores/métricas
    descripcionKPI: Optional[str] = None      # explicación del KPI (solo cuando esKPI)
    promptTranscrito: Optional[str] = None    # solo cuando vino de audio
