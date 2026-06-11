"""Router: reportes dinámicos (texto y audio)."""
from __future__ import annotations

from fastapi import APIRouter, File, UploadFile

from app.schemas.reporte import RespuestaGenerarReporte, SolicitudGenerarReporte
from app.services import reporte_service

router = APIRouter(tags=["reportes"])


@router.post("/generar-reporte", response_model=RespuestaGenerarReporte)
async def generar_reporte_texto(solicitud: SolicitudGenerarReporte):
    """Genera una consulta de reporte a partir de un prompt de texto."""
    return await reporte_service.generar_pipeline_desde_prompt(solicitud.prompt)


@router.post("/generar-reporte-audio", response_model=RespuestaGenerarReporte)
async def generar_reporte_audio(audio: UploadFile = File(...)):
    """Transcribe el audio con Whisper (Groq) y genera la consulta del reporte."""
    audio_bytes = await audio.read()
    return await reporte_service.generar_reporte_audio(audio.filename, audio_bytes)
