"""Punto de entrada del ai-service.

Solo crea la app FastAPI, configura middleware y monta los routers.
La lógica vive en services/ y adapters/ (ver documentacion5/02_ARQUITECTURA...).

Ejecutar:  uvicorn app.main:app --host 0.0.0.0 --port 8001
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.core.exceptions import registrar_manejadores
from app.core.logging import configurar_logging

configurar_logging()

app = FastAPI(title="Workflow AI Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

registrar_manejadores(app)
app.include_router(api_router)


@app.get("/health")
def health():
    return {"estado": "ok", "modelo": settings.groq_model}
