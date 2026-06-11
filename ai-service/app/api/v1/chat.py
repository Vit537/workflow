"""Router: chatbot proxy."""
from __future__ import annotations

from fastapi import APIRouter

from app.schemas.chat import RespuestaChat, SolicitudChat
from app.services import chat_service

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=RespuestaChat)
async def chatbot(solicitud: SolicitudChat):
    """Endpoint proxy de chatbot: recibe historial de mensajes y devuelve la respuesta del LLM."""
    return chat_service.chat(solicitud)
