"""Configuración central del ai-service.

Lee las variables de entorno desde `.env` y las expone tipadas mediante
pydantic-settings. Centralizar la config evita los `os.getenv` repartidos por
todo el código y falla rápido si falta algo crítico.
"""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── API keys de Groq (se usan con failover automático) ──────────────────
    # Históricamente: POLICY = diagramas, CHAT = chatbot/reportes.
    # Ahora cualquiera sirve de respaldo de la otra (ver adapters/llm/groq_client.py).
    groq_api_key_policy: str = ""
    groq_api_key_chat: str = ""

    # ── Modelos ─────────────────────────────────────────────────────────────
    groq_model: str = "llama-3.3-70b-versatile"         # diagramas (modelo capaz; va en su propio token)
    groq_model_reporte: str = "llama-3.3-70b-versatile"  # reportes
    groq_model_chat: str = "llama-3.3-70b-versatile"     # chatbot
    groq_model_whisper: str = "whisper-large-v3-turbo"   # transcripción de audio

    # ── MongoDB (para entrenar los modelos desde la UI) ─────────────────────
    mongo_uri: str = "mongodb://localhost:27017/workflow_db"

    # ── CORS ────────────────────────────────────────────────────────────────
    allowed_origins: str = "http://localhost:4200"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
