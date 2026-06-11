"""Lógica de negocio: chatbot proxy (CU-16)."""
from __future__ import annotations

from fastapi import HTTPException

from app.adapters.llm import groq_client
from app.core.config import settings
from app.schemas.chat import RespuestaChat, SolicitudChat


def chat(solicitud: SolicitudChat) -> RespuestaChat:
    mensajes = [{"role": m.role, "content": m.content} for m in solicitud.mensajes]
    try:
        respuesta = groq_client.chat_completion(
            mensajes,
            model=settings.groq_model_chat,
            temperature=0.4,
            max_tokens=600,
            prefer="chat",
            failover=False,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc))
    return RespuestaChat(respuesta=respuesta)
