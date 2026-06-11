"""Cliente Groq con failover automático entre las dos API keys.

Idea: el proyecto tiene dos API keys (POLICY y CHAT). Antes cada una estaba
"fija" a un módulo, así que si una se quedaba sin tokens ese módulo se caía.

Aquí se implementa failover real: se intenta con la key preferida y, si falla
por límite de tasa / cuota agotada (HTTP 429 o errores de quota), se reintenta
automáticamente con la otra key. Así no se pierde la conexión mientras se trabaja.

- `prefer="policy"` → intenta primero POLICY, luego CHAT.
- `prefer="chat"`   → intenta primero CHAT, luego POLICY.
"""
from __future__ import annotations

import logging
from typing import Awaitable, Callable, TypeVar

from fastapi import HTTPException
from groq import Groq
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage

from app.core.config import settings

log = logging.getLogger(__name__)

T = TypeVar("T")


# ── Selección de keys ────────────────────────────────────────────────────────

def _ordered_keys(prefer: str) -> list[str]:
    """Devuelve las API keys disponibles, con la preferida primero."""
    policy = settings.groq_api_key_policy
    chat = settings.groq_api_key_chat
    if prefer == "chat":
        candidatas = [chat, policy]
    else:  # "policy" o cualquier otro valor
        candidatas = [policy, chat]
    return [k for k in candidatas if k]


def _es_reintentable(exc: Exception) -> bool:
    """True si el error sugiere probar con la otra key (límite/cuota)."""
    status = getattr(exc, "status_code", None) or getattr(exc, "status", None) or getattr(exc, "code", None)
    if status == 429:
        return True
    msg = str(exc).lower()
    indicadores = (
        "rate limit", "rate_limit", "rate-limit",
        "quota", "insufficient_quota", "insufficient quota",
        "429", "too many requests",
        "tokens per", "requests per", "tpd", "rpd", "tpm", "rpm",
    )
    return any(t in msg for t in indicadores)


# ── Núcleo de failover ───────────────────────────────────────────────────────

def _run_with_failover(prefer: str, fn: Callable[[str], T], failover: bool = True) -> T:
    keys = _ordered_keys(prefer)
    if not keys:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY no configurada (POLICY/CHAT)")
    if not failover:
        keys = keys[:1]  # separación estricta de tokens: usar solo la key preferida
    ultimo: Exception | None = None
    for i, key in enumerate(keys):
        try:
            return fn(key)
        except Exception as exc:  # noqa: BLE001
            ultimo = exc
            if _es_reintentable(exc) and i < len(keys) - 1:
                log.warning("Groq key #%d agotada/limitada (%s); probando la siguiente…", i + 1, exc)
                continue
            raise
    assert ultimo is not None  # pragma: no cover
    raise ultimo


async def _arun_with_failover(prefer: str, afn: Callable[[str], Awaitable[T]], failover: bool = True) -> T:
    keys = _ordered_keys(prefer)
    if not keys:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY no configurada (POLICY/CHAT)")
    if not failover:
        keys = keys[:1]  # separación estricta de tokens: usar solo la key preferida
    ultimo: Exception | None = None
    for i, key in enumerate(keys):
        try:
            return await afn(key)
        except Exception as exc:  # noqa: BLE001
            ultimo = exc
            if _es_reintentable(exc) and i < len(keys) - 1:
                log.warning("Groq key #%d agotada/limitada (%s); probando la siguiente…", i + 1, exc)
                continue
            raise
    assert ultimo is not None  # pragma: no cover
    raise ultimo


# ── API pública del adapter ──────────────────────────────────────────────────

async def ainvoke_chat(
    messages: list[BaseMessage],
    *,
    model: str,
    temperature: float,
    prefer: str = "policy",
    failover: bool = True,
) -> str:
    """Invoca un chat de LangChain (ChatGroq). Devuelve el contenido.

    failover=False → usa SOLO el token preferido (separación estricta de tokens).
    """

    async def call(key: str) -> str:
        llm = ChatGroq(api_key=key, model=model, temperature=temperature)
        resultado = await llm.ainvoke(messages)
        return resultado.content

    return await _arun_with_failover(prefer, call, failover=failover)


def chat_completion(
    messages: list[dict],
    *,
    model: str,
    temperature: float,
    max_tokens: int,
    prefer: str = "chat",
    failover: bool = True,
) -> str:
    """Completion vía SDK de Groq. Devuelve el texto de la respuesta.

    failover=False → usa SOLO el token preferido (separación estricta de tokens).
    """

    def call(key: str) -> str:
        client = Groq(api_key=key)
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return completion.choices[0].message.content or "Sin respuesta."

    return _run_with_failover(prefer, call, failover=failover)


def transcribe_audio(
    filename: str,
    audio_bytes: bytes,
    *,
    model: str,
    language: str = "es",
    prefer: str = "chat",
    failover: bool = True,
) -> str:
    """Transcribe audio con Whisper (Groq). Devuelve el texto.

    failover=False → usa SOLO el token preferido (separación estricta de tokens).
    """

    def call(key: str) -> str:
        client = Groq(api_key=key)
        transcripcion = client.audio.transcriptions.create(
            model=model,
            file=(filename, audio_bytes),
            language=language,
            response_format="text",
        )
        return str(transcripcion).strip()

    return _run_with_failover(prefer, call, failover=failover)
