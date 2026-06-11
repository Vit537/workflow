"""Router: motor de enrutamiento y riesgo (TensorFlow)."""
from __future__ import annotations

from fastapi import APIRouter

from app.schemas.riesgo import (
    ContextoPaso,
    RespuestaAnomalia,
    RespuestaDemora,
    RespuestaPanel,
    RespuestaPrioridad,
    RespuestaRuta,
    SolicitudAnomalia,
    SolicitudPanel,
    SolicitudPrioridad,
    SolicitudRuta,
)
from app.services import riesgo_service

router = APIRouter(prefix="/riesgo", tags=["riesgo"])


@router.post("/demora", response_model=RespuestaDemora)
def demora(ctx: ContextoPaso):
    """Predice la probabilidad de demora y la duración estimada de un paso."""
    return riesgo_service.evaluar_demora(ctx)


@router.post("/ruta", response_model=RespuestaRuta)
def ruta(solicitud: SolicitudRuta):
    """Recomienda el mejor asesor (menor duración estimada + menor carga)."""
    return riesgo_service.recomendar_ruta(solicitud)


@router.post("/prioridad", response_model=RespuestaPrioridad)
def prioridad(solicitud: SolicitudPrioridad):
    """Calcula un score de prioridad combinando riesgo de demora y antigüedad."""
    return riesgo_service.calcular_prioridad(solicitud)


@router.post("/anomalia", response_model=RespuestaAnomalia)
def anomalia(solicitud: SolicitudAnomalia):
    """Detecta si la duración de un paso es anómala."""
    return riesgo_service.detectar_anomalia(solicitud)


@router.post("/panel", response_model=RespuestaPanel)
def panel(solicitud: SolicitudPanel):
    """Batch para el dashboard admin: demora + prioridad + anomalía de varios trámites."""
    return riesgo_service.evaluar_panel(solicitud)


@router.post("/entrenar")
def entrenar():
    """Lanza el reentrenamiento de los modelos (en background) leyendo Mongo."""
    return riesgo_service.entrenar_modelos()


@router.get("/entrenar/estado")
def estado_entrenamiento():
    """Estado del entrenamiento: IDLE | ENTRENANDO | OK | ERROR + métricas."""
    return riesgo_service.estado_entrenamiento()
