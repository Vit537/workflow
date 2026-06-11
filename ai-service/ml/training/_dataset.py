"""Carga el export de trámites y construye las tablas de entrenamiento.

Usa app.adapters.ml.features para que las features sean idénticas a las de servir.
Ejecutar los scripts desde la raíz `ai-service/` para que el import `app...` funcione.
"""
from __future__ import annotations

import json
import os

from app.adapters.ml import features as F

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../ml
EXPORT = os.path.join(DIR, "data", "tramites_export.jsonl")


def cargar_tramites(ruta: str = EXPORT) -> list[dict]:
    if not os.path.exists(ruta):
        raise SystemExit(
            f"No existe {ruta}. Genera datos y expórtalos:\n"
            f"  python ml/data/seed_mongo.py --tramites 1500\n"
            f"  python ml/data/export_tramites.py"
        )
    with open(ruta, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def construir_tablas():
    """Devuelve (X, duraciones, demoras) a partir de todos los pasos completados."""
    import numpy as np
    X, dur, dem = [], [], []
    for t in cargar_tramites():
        for vector, duracion, demora in F.filas_de_tramite(t):
            X.append(vector)
            dur.append(duracion)
            dem.append(demora)
    return np.array(X, dtype="float32"), np.array(dur, dtype="float32"), np.array(dem, dtype="float32")
