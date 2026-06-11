"""Lógica del agente automatizado: orquesta recomendación NLP + conversación LLM.

Flujo:
  1) El recomendador NLP rankea las políticas según la consulta del cliente.
  2) Se arma el contexto (recomendación principal + alternativas + confianza).
  3) El LLM (Groq) genera una respuesta conversacional usando ese contexto.
  4) Si la confianza es baja (o no hay políticas), se sugiere derivar a un asesor humano.

La IA NO está obligada a terminar el trámite: solo da atención inmediata y orienta;
un asesor puede retomar el caso. La creación/avance del trámite la hace el backend
cuando el cliente confirma.
"""
from __future__ import annotations

from fastapi import HTTPException

from app.adapters.llm import groq_client, prompts
from app.adapters.nlp import policy_recommender
from app.core.config import settings
from app.schemas.agente import (
    RecomendacionPolitica,
    RespuestaAgente,
    SolicitudAgente,
)


def _a_schema(rec) -> RecomendacionPolitica:
    return RecomendacionPolitica(
        politicaId=rec.politicaId, nombre=rec.nombre, score=rec.score, confianza=rec.confianza
    )


def _construir_contexto(recs: list, todas_politicas: list) -> str:
    # Catálogo completo de servicios disponibles (para que el agente pueda ofrecerlos por nombre).
    nombres = [getattr(p, "nombre", "") for p in todas_politicas if getattr(p, "nombre", "")]
    catalogo = ("SERVICIOS/POLÍTICAS DISPONIBLES (úsalos para orientar al cliente):\n"
                + "\n".join(f"- {n}" for n in nombres)) if nombres else \
               "No hay políticas publicadas disponibles por ahora."

    if not recs:
        return (catalogo + "\n\nNo se identificó una coincidencia clara. Muestra al cliente la lista "
                "de servicios disponibles y pídele que elija uno o reformule su necesidad. "
                "Ofrece un asesor humano solo como alternativa.")

    lineas = [catalogo, "", "Coincidencias para esta consulta (ordenadas por relevancia):"]
    for r in recs:
        lineas.append(f"- {r.nombre} (relevancia {r.score:.2f}, confianza {r.confianza})")
    principal = recs[0]
    if principal.confianza == "BAJA":
        lineas.append(
            f"\nLa mejor coincidencia (\"{principal.nombre}\") tiene confianza BAJA. NO la impongas: "
            "muestra la lista de servicios disponibles y pregunta cuál se acerca a lo que necesita "
            "o pide que reformule. Ofrece un asesor humano como alternativa, no como única salida.")
    else:
        lineas.append(f"\nRecomendación principal: \"{principal.nombre}\" con confianza {principal.confianza}.")
    return "\n".join(lineas)


def procesar_consulta(solicitud: SolicitudAgente) -> RespuestaAgente:
    recs = policy_recommender.recomendar(solicitud.mensaje, solicitud.politicas, top_k=3)

    principal = recs[0] if recs else None
    sugiere_asesor = (principal is None) or (principal.confianza == "BAJA")

    contexto = _construir_contexto(recs, solicitud.politicas)
    mensajes = [
        {"role": "system", "content": prompts.SYSTEM_PROMPT_AGENTE},
        {"role": "system", "content": contexto},
    ]
    for m in solicitud.historial:
        if m.role in ("user", "assistant"):
            mensajes.append({"role": m.role, "content": m.content})
    mensajes.append({"role": "user", "content": solicitud.mensaje})

    try:
        respuesta = groq_client.chat_completion(
            mensajes,
            model=settings.groq_model_chat,
            temperature=0.4,
            max_tokens=400,
            prefer="chat",
            failover=False,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc))

    return RespuestaAgente(
        respuesta=respuesta,
        recomendacion=_a_schema(principal) if (principal and not sugiere_asesor) else None,
        alternativas=[_a_schema(r) for r in recs[1:]] if not sugiere_asesor else [],
        sugiereAsesor=sugiere_asesor,
    )
