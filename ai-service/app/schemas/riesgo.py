"""Schemas del motor de enrutamiento y riesgo (Área 4 — TensorFlow)."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ContextoPaso(BaseModel):
    nombrePolitica: str = ""
    etiquetaNodo: str = ""
    carrilNombre: str = ""
    asignadoA: str = ""
    horaInicio: int = Field(9, ge=0, le=23)
    diaSemana: int = Field(2, ge=0, le=6)  # lunes=0 ... domingo=6
    indicePaso: int = 0


class RespuestaDemora(BaseModel):
    probabilidadDemora: float
    riesgo: str  # ALTO | MEDIO | BAJO
    duracionEstimadaHoras: float
    fuente: str


class AsesorCandidato(BaseModel):
    asignadoA: str
    cargaActual: int = 0


class SolicitudRuta(ContextoPaso):
    candidatos: list[AsesorCandidato] = Field(default_factory=list)


class OpcionRuta(BaseModel):
    asignadoA: str
    duracionEstimadaHoras: float
    score: float


class RespuestaRuta(BaseModel):
    recomendado: Optional[OpcionRuta] = None
    ranking: list[OpcionRuta] = Field(default_factory=list)
    fuente: str


class SolicitudPrioridad(ContextoPaso):
    antiguedadHoras: float = 0.0


class RespuestaPrioridad(BaseModel):
    scorePrioridad: float
    prioridad: str  # ALTA | MEDIA | BAJA
    fuente: str


class SolicitudAnomalia(ContextoPaso):
    duracionHoras: float = Field(..., ge=0)


class RespuestaAnomalia(BaseModel):
    esAnomalia: bool
    score: float
    fuente: str


# ── Panel (batch) para el dashboard del administrador ────────────────────────

class ItemPanel(ContextoPaso):
    tramiteId: str = ""
    nombreCliente: str = ""
    antiguedadHoras: float = 0.0
    duracionHoras: float = 0.0


class SolicitudPanel(BaseModel):
    items: list[ItemPanel] = Field(default_factory=list)


class PanelItem(BaseModel):
    tramiteId: str
    nombrePolitica: str
    etiquetaNodo: str
    carrilNombre: str
    asignadoA: str
    nombreCliente: str
    probabilidadDemora: float
    riesgoDemora: str
    scorePrioridad: float
    prioridad: str
    esAnomalia: bool
    fuente: str


class RespuestaPanel(BaseModel):
    items: list[PanelItem] = Field(default_factory=list)
