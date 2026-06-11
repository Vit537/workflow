"""Utilidades para extraer JSON válido de las respuestas del LLM.

Antes esta lógica estaba duplicada en `main.py` (una versión para diagramas y
otra para reportes). Aquí se unifica.
"""
from __future__ import annotations

import json
import re
from typing import Any


def _strip_markdown(texto: str) -> str:
    """Quita bloques markdown tipo ```json ... ```."""
    if "```" in texto:
        lineas = texto.splitlines()
        texto = "\n".join(l for l in lineas if not l.strip().startswith("```")).strip()
    return texto


def extraer_json(texto: str, *, quitar_trailing_commas: bool = False) -> dict[str, Any]:
    """Extrae el primer objeto JSON válido de la respuesta del modelo.

    - Limpia bloques markdown.
    - Opcionalmente elimina comas finales (trailing commas) que el modelo a veces
      genera y que invalidan el JSON.
    - Decodifica desde el primer `{` y se detiene en el primer objeto completo.

    Lanza ``json.JSONDecodeError`` si no encuentra/parsea JSON.
    """
    texto = _strip_markdown(texto)
    if quitar_trailing_commas:
        texto = re.sub(r",\s*([}\]])", r"\1", texto)

    inicio = texto.find("{")
    if inicio == -1:
        raise json.JSONDecodeError("No se encontró JSON en la respuesta", texto, 0)

    datos, _ = json.JSONDecoder().raw_decode(texto, inicio)
    return datos
