"""Schemas del agente automatizado (Área 2 — atención inmediata por IA)."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class PoliticaCandidata(BaseModel):
    id: str
    nombre: str
    descripcion: str = ""


class MensajeAgente(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str


class SolicitudAgente(BaseModel):
    mensaje: str = Field(..., min_length=2, description="Consulta del cliente en lenguaje natural")
    politicas: list[PoliticaCandidata] = Field(default_factory=list)
    historial: list[MensajeAgente] = Field(default_factory=list)


class RecomendacionPolitica(BaseModel):
    politicaId: str
    nombre: str
    score: float
    confianza: str  # ALTA | MEDIA | BAJA


class RespuestaAgente(BaseModel):
    respuesta: str
    recomendacion: Optional[RecomendacionPolitica] = None
    alternativas: list[RecomendacionPolitica] = Field(default_factory=list)
    sugiereAsesor: bool = False
    promptTranscrito: Optional[str] = None  # solo cuando vino de audio
