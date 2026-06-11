"""Preprocesamiento de texto en español para los módulos de NLP."""
from __future__ import annotations

import re
import unicodedata


def quitar_acentos(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def normalizar(texto: str) -> str:
    """Minúsculas, sin acentos y espacios colapsados. Útil para matching robusto."""
    if not texto:
        return ""
    texto = quitar_acentos(texto.lower())
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip()
