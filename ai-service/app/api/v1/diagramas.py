"""Router: generación/edición de diagramas swimlane."""
from __future__ import annotations

from fastapi import APIRouter

from app.schemas.diagrama import RespuestaGenerarDiagrama, SolicitudGenerarDiagrama
from app.services import diagrama_service

router = APIRouter(tags=["diagramas"])


@router.post("/generar-diagrama", response_model=RespuestaGenerarDiagrama)
async def generar_diagrama(solicitud: SolicitudGenerarDiagrama):
    return await diagrama_service.generar_diagrama(solicitud)
