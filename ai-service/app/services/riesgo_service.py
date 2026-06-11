"""Lógica del motor de riesgo: traduce solicitudes a predicciones del adapter ML."""
from __future__ import annotations

from app.adapters.ml import riesgo, trainer
from app.schemas.riesgo import (
    ContextoPaso,
    OpcionRuta,
    PanelItem,
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


def _nivel_riesgo(prob: float) -> str:
    return "ALTO" if prob >= 0.6 else "MEDIO" if prob >= 0.35 else "BAJO"


def evaluar_demora(ctx: ContextoPaso) -> RespuestaDemora:
    d = ctx.model_dump()
    prob, fuente = riesgo.predecir_demora(d)
    dur, _ = riesgo.predecir_duracion(d)
    return RespuestaDemora(
        probabilidadDemora=round(prob, 4),
        riesgo=_nivel_riesgo(prob),
        duracionEstimadaHoras=dur,
        fuente=fuente,
    )


def recomendar_ruta(sol: SolicitudRuta) -> RespuestaRuta:
    ctx = sol.model_dump()
    candidatos = [c.model_dump() for c in sol.candidatos]
    opciones = riesgo.recomendar_ruta(ctx, candidatos)
    ranking = [OpcionRuta(**o) for o in opciones]
    fuente = "modelo" if riesgo.model_registry.obtener_modelo("duration") is not None else "heuristica"
    return RespuestaRuta(
        recomendado=ranking[0] if ranking else None,
        ranking=ranking,
        fuente=fuente,
    )


def calcular_prioridad(sol: SolicitudPrioridad) -> RespuestaPrioridad:
    score, nivel, fuente = riesgo.calcular_prioridad(sol.model_dump(), sol.antiguedadHoras)
    return RespuestaPrioridad(scorePrioridad=score, prioridad=nivel, fuente=fuente)


def detectar_anomalia(sol: SolicitudAnomalia) -> RespuestaAnomalia:
    es, score, fuente = riesgo.detectar_anomalia(sol.model_dump(), sol.duracionHoras)
    return RespuestaAnomalia(esAnomalia=es, score=score, fuente=fuente)


def evaluar_panel(sol: SolicitudPanel) -> RespuestaPanel:
    """Batch: evalúa demora + prioridad + anomalía para cada trámite activo del panel."""
    resultados: list[PanelItem] = []
    for item in sol.items:
        ctx = item.model_dump()
        prob, fuente = riesgo.predecir_demora(ctx)
        score, prioridad, _ = riesgo.calcular_prioridad(ctx, item.antiguedadHoras)
        es_anom, _, _ = riesgo.detectar_anomalia(ctx, item.duracionHoras)
        resultados.append(PanelItem(
            tramiteId=item.tramiteId,
            nombrePolitica=item.nombrePolitica,
            etiquetaNodo=item.etiquetaNodo,
            carrilNombre=item.carrilNombre,
            asignadoA=item.asignadoA,
            nombreCliente=item.nombreCliente,
            probabilidadDemora=round(prob, 4),
            riesgoDemora=_nivel_riesgo(prob),
            scorePrioridad=score,
            prioridad=prioridad,
            esAnomalia=es_anom,
            fuente=fuente,
        ))
    # Ordenar por prioridad descendente (lo más urgente primero)
    resultados.sort(key=lambda r: r.scorePrioridad, reverse=True)
    return RespuestaPanel(items=resultados)


def entrenar_modelos() -> dict:
    return trainer.lanzar()


def estado_entrenamiento() -> dict:
    return trainer.estado()
