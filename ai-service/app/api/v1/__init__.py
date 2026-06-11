"""Agrupa los routers de la API bajo el prefijo /api/ia (compatible con el backend Java)."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import agente, chat, diagramas, reportes, riesgo

api_router = APIRouter(prefix="/api/ia")
api_router.include_router(diagramas.router)
api_router.include_router(reportes.router)
api_router.include_router(chat.router)
api_router.include_router(agente.router)
api_router.include_router(riesgo.router)
