"""Lógica de negocio: generación/edición de diagramas swimlane con el LLM."""
from __future__ import annotations

import json

from fastapi import HTTPException
from langchain_core.messages import HumanMessage, SystemMessage

from app.adapters.llm import groq_client, prompts
from app.adapters.llm.json_utils import extraer_json
from app.adapters.nlp import doc_requirement
from app.core.config import settings
from app.schemas.diagrama import (
    AccionIA,
    DiagramaIA,
    RespuestaGenerarDiagrama,
    SolicitudGenerarDiagrama,
)


async def generar_diagrama(solicitud: SolicitudGenerarDiagrama) -> RespuestaGenerarDiagrama:
    tiene_diagrama = solicitud.diagramaActual is not None and (
        len(solicitud.diagramaActual.carriles) > 0
        or len(solicitud.diagramaActual.nodos) > 0
    )

    if tiene_diagrama:
        diagrama_json = json.dumps(
            solicitud.diagramaActual.model_dump(), ensure_ascii=False, indent=2
        )
        messages = [
            SystemMessage(content=prompts.SYSTEM_PROMPT_EDITAR),
            HumanMessage(
                content=f"Diagrama actual:\n{diagrama_json}\n\nInstrucción del usuario: {solicitud.prompt}"
            ),
        ]
        modo = "EDITAR"
    else:
        messages = [
            SystemMessage(content=prompts.SYSTEM_PROMPT_CREAR),
            HumanMessage(
                content=f"Crea el diagrama swimlane para el siguiente proceso:\n\n{solicitud.prompt}"
            ),
        ]
        modo = "CREAR"

    try:
        contenido = (
            await groq_client.ainvoke_chat(
                messages, model=settings.groq_model, temperature=0.2,
                prefer="policy", failover=False,  # diagramas usan SOLO el token POLICY
            )
        ).strip()
        datos = extraer_json(contenido)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"El modelo devolvió JSON inválido: {exc}")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc))

    descripcion = datos.get(
        "descripcion", f'Diagrama {modo.lower()} desde: "{solicitud.prompt[:80]}"'
    )

    if modo == "EDITAR":
        acciones = [AccionIA(**a) for a in datos.get("acciones", [])]
        return RespuestaGenerarDiagrama(modo="EDITAR", acciones=acciones, descripcion=descripcion)

    try:
        diagrama = DiagramaIA(**datos)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=f"Estructura de diagrama inválida: {exc}")

    _enriquecer_requerimiento_documentos(diagrama)
    return RespuestaGenerarDiagrama(modo="CREAR", diagrama=diagrama, descripcion=descripcion)


def _enriquecer_requerimiento_documentos(diagrama: DiagramaIA) -> None:
    """Aplica el clasificador NLP a cada ACTIVIDAD para validar/corregir si requiere
    documentos y de qué tipo (refuerza lo que devolvió el LLM)."""
    for nodo in diagrama.nodos:
        if nodo.tipo == "ACTIVIDAD" and nodo.formulario is not None:
            doc_requirement.enriquecer_formulario(nodo.formulario)
