"""Recomendador de políticas (NLP): dada la consulta del cliente, encuentra la
política más parecida por similitud semántica/léxica y asigna una confianza.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.adapters.nlp import embeddings

# Umbrales de confianza (sobre el score de similitud en [0,1]).
UMBRAL_ALTA = 0.45
UMBRAL_MEDIA = 0.20


@dataclass
class Recomendacion:
    politicaId: str
    nombre: str
    score: float
    confianza: str  # ALTA | MEDIA | BAJA


def _confianza(score: float) -> str:
    if score >= UMBRAL_ALTA:
        return "ALTA"
    if score >= UMBRAL_MEDIA:
        return "MEDIA"
    return "BAJA"


def recomendar(consulta: str, politicas: list, top_k: int = 3) -> list[Recomendacion]:
    """`politicas`: objetos con .id, .nombre, .descripcion. Devuelve ranking top_k."""
    if not politicas:
        return []
    textos = [f"{getattr(p, 'nombre', '')}. {getattr(p, 'descripcion', '') or ''}" for p in politicas]
    scores = embeddings.similitudes(consulta, textos)

    pares = sorted(zip(politicas, scores), key=lambda x: x[1], reverse=True)
    recs = [
        Recomendacion(
            politicaId=getattr(p, "id", ""),
            nombre=getattr(p, "nombre", ""),
            score=round(float(s), 4),
            confianza=_confianza(float(s)),
        )
        for p, s in pares[:top_k]
    ]
    return recs
