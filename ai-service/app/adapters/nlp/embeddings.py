"""Similitud semántica entre una consulta y un conjunto de documentos.

Dos niveles (igual patrón que doc_requirement):
  1) Si `sentence-transformers` está disponible → embeddings semánticos (mejor calidad).
  2) Si no → TF-IDF + coseno implementado en stdlib (sin dependencias pesadas).

Devuelve una lista de scores en [0, 1], uno por documento.
"""
from __future__ import annotations

import logging
import math
from collections import Counter

from app.adapters.nlp.preprocess import normalizar

log = logging.getLogger(__name__)

_MODELO = None
_MODELO_INTENTADO = False
_PALABRAS_VACIAS = {
    "de", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o", "a",
    "en", "que", "del", "al", "por", "para", "con", "se", "su", "sus", "mi",
    "me", "lo", "es", "como", "mas", "más", "ya", "si", "no", "le", "este",
    "esta", "esto", "quiero", "necesito", "deseo", "puedo", "hacer", "como",
}


def _tokenizar(texto: str) -> list[str]:
    t = normalizar(texto)
    return [w for w in t.replace(",", " ").replace(".", " ").split() if w and w not in _PALABRAS_VACIAS and len(w) > 2]


# ── TF-IDF + coseno (fallback puro Python) ───────────────────────────────────

def _similitudes_tfidf(consulta: str, documentos: list[str]) -> list[float]:
    docs_tokens = [_tokenizar(d) for d in documentos]
    q_tokens = _tokenizar(consulta)
    if not q_tokens:
        return [0.0] * len(documentos)

    n_docs = len(documentos) + 1  # +1 por la consulta
    todos = docs_tokens + [q_tokens]

    # idf
    df: Counter = Counter()
    for toks in todos:
        for w in set(toks):
            df[w] += 1
    idf = {w: math.log((n_docs + 1) / (c + 1)) + 1 for w, c in df.items()}

    def vector(toks: list[str]) -> dict[str, float]:
        tf = Counter(toks)
        total = len(toks) or 1
        return {w: (c / total) * idf.get(w, 0.0) for w, c in tf.items()}

    def coseno(a: dict[str, float], b: dict[str, float]) -> float:
        comunes = set(a) & set(b)
        num = sum(a[w] * b[w] for w in comunes)
        na = math.sqrt(sum(v * v for v in a.values()))
        nb = math.sqrt(sum(v * v for v in b.values()))
        return num / (na * nb) if na and nb else 0.0

    qv = vector(q_tokens)
    return [coseno(qv, vector(toks)) for toks in docs_tokens]


# ── sentence-transformers (opcional) ─────────────────────────────────────────

def _cargar_modelo():
    global _MODELO, _MODELO_INTENTADO
    if _MODELO_INTENTADO:
        return _MODELO
    _MODELO_INTENTADO = True
    try:
        from sentence_transformers import SentenceTransformer
        _MODELO = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        log.info("Embeddings: usando sentence-transformers (multilingüe).")
    except Exception as exc:  # noqa: BLE001
        log.info("sentence-transformers no disponible (%s); usando TF-IDF.", exc)
        _MODELO = None
    return _MODELO


def _similitudes_st(consulta: str, documentos: list[str]) -> list[float] | None:
    modelo = _cargar_modelo()
    if modelo is None:
        return None
    try:
        from sentence_transformers import util
        emb = modelo.encode([consulta] + documentos, convert_to_tensor=True, normalize_embeddings=True)
        sims = util.cos_sim(emb[0:1], emb[1:])[0]
        return [max(0.0, float(s)) for s in sims]
    except Exception as exc:  # noqa: BLE001
        log.warning("Falló embeddings ST (%s); usando TF-IDF.", exc)
        return None


# ── API pública ──────────────────────────────────────────────────────────────

def similitudes(consulta: str, documentos: list[str]) -> list[float]:
    if not documentos:
        return []
    st = _similitudes_st(consulta, documentos)
    if st is not None:
        return st
    return _similitudes_tfidf(consulta, documentos)
