"""Schemas Pydantic del módulo de chatbot (CU-16)."""
from __future__ import annotations

from pydantic import BaseModel


class MensajeChatBot(BaseModel):
    role: str  # 'system' | 'user' | 'assistant'
    content: str


class SolicitudChat(BaseModel):
    mensajes: list[MensajeChatBot]


class RespuestaChat(BaseModel):
    respuesta: str
