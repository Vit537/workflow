"""Lógica de negocio: reportes dinámicos (texto y audio)."""
from __future__ import annotations

import json

from fastapi import HTTPException
from langchain_core.messages import HumanMessage, SystemMessage

from app.adapters.llm import groq_client, prompts
from app.adapters.llm.json_utils import extraer_json
from app.core.config import settings
from app.schemas.reporte import RespuestaGenerarReporte


async def generar_pipeline_desde_prompt(prompt: str) -> RespuestaGenerarReporte:
    messages = [
        SystemMessage(content=prompts.SYSTEM_PROMPT_REPORTE),
        HumanMessage(content=f"Genera el reporte para: {prompt}"),
    ]
    try:
        contenido = (
            await groq_client.ainvoke_chat(
                messages, model=settings.groq_model_reporte, temperature=0,
                prefer="chat", failover=False,  # resto usa SOLO el token CHAT
            )
        ).strip()
        datos = extraer_json(contenido, quitar_trailing_commas=True)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"El modelo devolvió JSON inválido: {exc}")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc))

    es_kpi = bool(datos.get("esKPI", False))
    return RespuestaGenerarReporte(
        titulo=datos.get("titulo", "Reporte"),
        descripcion=datos.get("descripcion", ""),
        coleccion=datos.get("coleccion", "tramites"),
        pipeline=datos.get("pipeline", []),
        columnas=datos.get("columnas", []),
        esKPI=es_kpi,
        descripcionKPI=(datos.get("descripcionKPI") or None) if es_kpi else None,
    )


async def generar_reporte_audio(filename: str | None, audio_bytes: bytes) -> RespuestaGenerarReporte:
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="El archivo de audio está vacío")

    try:
        prompt_transcrito = groq_client.transcribe_audio(
            filename or "audio.webm",
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

    if not prompt_transcrito:
        raise HTTPException(status_code=422, detail="No se pudo transcribir el audio")

    resultado = await generar_pipeline_desde_prompt(prompt_transcrito)
    resultado.promptTranscrito = prompt_transcrito
    return resultado
