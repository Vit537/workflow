"""Router: agente automatizado (consulta por texto y por voz)."""
from __future__ import annotations

import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.adapters.llm import groq_client
from app.core.config import settings
from app.schemas.agente import (
    MensajeAgente,
    PoliticaCandidata,
    RespuestaAgente,
    SolicitudAgente,
)
from app.services import agente_service

router = APIRouter(prefix="/agente", tags=["agente"])


@router.post("/consulta", response_model=RespuestaAgente)
async def consulta(solicitud: SolicitudAgente):
    """Atención inmediata por IA a partir de texto."""
    return agente_service.procesar_consulta(solicitud)


@router.post("/consulta-audio", response_model=RespuestaAgente)
async def consulta_audio(
    audio: UploadFile = File(...),
    politicas: str = Form("[]"),
    historial: str = Form("[]"),
):
    """Atención inmediata por IA a partir de voz (Whisper transcribe y luego procesa)."""
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="El archivo de audio está vacío")

    try:
        texto = groq_client.transcribe_audio(
            audio.filename or "audio.webm",
            audio_bytes,
            model=settings.groq_model_whisper,
            language="es",
            prefer="chat",
            failover=False,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error al transcribir el audio: {exc}")

    if not texto:
        raise HTTPException(status_code=422, detail="No se pudo transcribir el audio")

    try:
        pols = [PoliticaCandidata(**p) for p in json.loads(politicas)]
    except Exception:  # noqa: BLE001
        pols = []
    try:
        hist = [MensajeAgente(**m) for m in json.loads(historial)]
    except Exception:  # noqa: BLE001
        hist = []

    solicitud = SolicitudAgente(mensaje=texto, politicas=pols, historial=hist)
    resultado = agente_service.procesar_consulta(solicitud)
    resultado.promptTranscrito = texto
    return resultado
