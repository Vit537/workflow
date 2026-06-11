"""Schemas Pydantic del módulo de diagramas swimlane (CU generación de diagramas)."""
from __future__ import annotations

import uuid
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CarrilIA(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    nombre: str
    orden: int


class CampoIA(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nombre: str
    etiqueta: str
    tipoCampo: str = "TEXTO"  # TEXTO | NUMERO | FECHA | BOOLEANO | SELECCION
    requerido: bool = False

    @field_validator("tipoCampo", mode="before")
    @classmethod
    def tipoCampo_valido(cls, v: Any) -> str:
        validos = {"TEXTO", "NUMERO", "FECHA", "BOOLEANO", "SELECCION"}
        return v if v in validos else "TEXTO"


class FormularioIA(BaseModel):
    model_config = ConfigDict(extra="ignore")
    titulo: str
    instrucciones: str = ""
    requisitos: list[str] = Field(default_factory=list)
    campos: list[CampoIA] = Field(default_factory=list)

    # ── Requerimiento de archivos (Fase 1 — NLP) ────────────────────────────
    # Coinciden con los campos del modelo Java `Formulario`, así fluyen
    # transparentemente a través del proxy y se guardan al crear la política.
    requiereDocumentos: bool = False
    tiposPermitidos: list[str] = Field(default_factory=list)  # ext: pdf, jpg, png, docx, xlsx
    maxArchivos: Optional[int] = None

    @field_validator("requisitos", mode="before")
    @classmethod
    def requisitos_no_null(cls, v: Any) -> list[str]:
        return v if isinstance(v, list) else []

    @field_validator("campos", mode="before")
    @classmethod
    def campos_no_null(cls, v: Any) -> list:
        return v if isinstance(v, list) else []

    @field_validator("requiereDocumentos", mode="before")
    @classmethod
    def requiere_no_null(cls, v: Any) -> bool:
        return bool(v) if v is not None else False

    @field_validator("tiposPermitidos", mode="before")
    @classmethod
    def tipos_no_null(cls, v: Any) -> list[str]:
        return v if isinstance(v, list) else []


class NodoIA(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    carrilId: str
    etiqueta: str
    tipo: str
    tipoFlujo: Optional[str] = "LINEAL"
    posX: Optional[float] = 50.0
    posY: Optional[float] = 50.0
    ancho: Optional[float] = 120.0
    alto: Optional[float] = 50.0
    condiciones: Optional[list[str]] = Field(default_factory=list)
    formulario: Optional[FormularioIA] = None

    @field_validator("condiciones", mode="before")
    @classmethod
    def condiciones_no_null(cls, v: Any) -> list[str]:
        return v if isinstance(v, list) else []

    @field_validator("tipoFlujo", mode="before")
    @classmethod
    def tipoFlujo_no_null(cls, v: Any) -> str:
        return v if v else "LINEAL"

    @field_validator("formulario", mode="before")
    @classmethod
    def formulario_no_null(cls, v: Any) -> Optional[dict]:
        return v if isinstance(v, dict) else None


class ConexionIA(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    nodoOrigenId: str
    nodoDestinoId: str
    etiqueta: Optional[str] = None


class DiagramaIA(BaseModel):
    model_config = ConfigDict(extra="ignore")
    carriles: list[CarrilIA]
    nodos: list[NodoIA]
    conexiones: list[ConexionIA]


# ── Modelos de request/response ────────────────────────────────────────────

class SolicitudGenerarDiagrama(BaseModel):
    prompt: str = Field(..., min_length=10, description="Instrucción en lenguaje natural")
    diagramaActual: Optional[DiagramaIA] = Field(
        None, description="Diagrama existente a modificar (None = crear desde cero)"
    )


class AccionIA(BaseModel):
    model_config = ConfigDict(extra="ignore")
    # AGREGAR_CARRIL | AGREGAR_NODO | AGREGAR_CONEXION | ELIMINAR_CARRIL | ELIMINAR_NODO
    # | ELIMINAR_CONEXION | EDITAR_NODO | EDITAR_CARRIL
    tipo: str
    datos: dict


class RespuestaGenerarDiagrama(BaseModel):
    modo: str  # CREAR | EDITAR
    diagrama: Optional[DiagramaIA] = None  # solo en modo CREAR
    acciones: Optional[list[AccionIA]] = None  # solo en modo EDITAR
    descripcion: str
