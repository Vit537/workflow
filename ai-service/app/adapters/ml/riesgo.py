"""Predicciones del motor de riesgo: demora, duración, ruta, prioridad y anomalías.

Cada función intenta usar el modelo TensorFlow correspondiente (vía model_registry);
si no está disponible, cae a una HEURÍSTICA basada en las mismas features. Así el
servicio responde siempre, y mejora automáticamente cuando se entrenan los modelos.

Modelos esperados en ml/models/:
  - delay_risk.keras   → clasificación binaria  P(demora)
  - duration.keras     → regresión              horas estimadas
  - anomaly.keras      → autoencoder            (reconstrucción → score)
"""
from __future__ import annotations

from app.adapters.ml import features as F
from app.adapters.ml import model_registry


# ── Riesgo de demora ─────────────────────────────────────────────────────────
def _demora_heuristica(ctx: dict) -> float:
    hora = int(ctx.get("horaInicio", 9))
    dia = int(ctx.get("diaSemana", 2))
    base = F.horas_base(ctx.get("nombrePolitica", ""), ctx.get("etiquetaNodo", ""))
    p = 0.15
    if F.es_pico(hora):
        p += 0.25
    if F.es_lunes_martes(dia):
        p += 0.20
    if F.es_finde(dia):
        p -= 0.10
    if base > 10:
        p += 0.15
    return max(0.0, min(1.0, p))


def predecir_demora(ctx: dict) -> tuple[float, str]:
    modelo = model_registry.obtener_modelo("delay_risk")
    prob = None
    if modelo is not None:
        try:
            import numpy as np
            x = np.array([F.construir_vector(ctx)], dtype="float32")
            prob = float(modelo.predict(x, verbose=0)[0][0])
            fuente = "modelo"
        except Exception:  # noqa: BLE001
            prob = None
    if prob is None:
        prob = _demora_heuristica(ctx)
        fuente = "heuristica"
    return prob, fuente


# ── Duración estimada ────────────────────────────────────────────────────────
def _duracion_heuristica(ctx: dict) -> float:
    hora = int(ctx.get("horaInicio", 9))
    dia = int(ctx.get("diaSemana", 2))
    base = F.horas_base(ctx.get("nombrePolitica", ""), ctx.get("etiquetaNodo", ""))
    factor = 1.0
    if F.es_pico(hora):
        factor *= 1.3
    if F.es_lunes_martes(dia):
        factor *= 1.25
    if F.es_finde(dia):
        factor *= 0.8
    return round(base * factor, 2)


def predecir_duracion(ctx: dict) -> tuple[float, str]:
    modelo = model_registry.obtener_modelo("duration")
    if modelo is not None:
        try:
            import numpy as np
            x = np.array([F.construir_vector(ctx)], dtype="float32")
            # El modelo predice log1p(horas) → des-logueamos con expm1.
            horas = float(np.expm1(modelo.predict(x, verbose=0)[0][0]))
            return round(max(0.0, horas), 2), "modelo"
        except Exception:  # noqa: BLE001
            pass
    return _duracion_heuristica(ctx), "heuristica"


# ── Anomalías ────────────────────────────────────────────────────────────────
def detectar_anomalia(ctx: dict, duracion_horas: float) -> tuple[bool, float, str]:
    base = F.horas_base(ctx.get("nombrePolitica", ""), ctx.get("etiquetaNodo", ""))
    modelo = model_registry.obtener_modelo("anomaly")
    if modelo is not None:
        try:
            import numpy as np
            vec = F.construir_vector(ctx) + [min(duracion_horas, 500.0) / 24.0]
            x = np.array([vec], dtype="float32")
            recon = modelo.predict(x, verbose=0)[0]
            error = float(np.mean((np.array(vec) - recon) ** 2))
            es = error > 0.05  # umbral de reconstrucción
            return es, round(error, 4), "modelo"
        except Exception:  # noqa: BLE001
            pass
    # Heurística: duración muy por encima de la base esperada
    ratio = duracion_horas / base if base else 0.0
    return ratio > 6.0, round(ratio, 2), "heuristica"


# ── Prioridad ────────────────────────────────────────────────────────────────
def calcular_prioridad(ctx: dict, antiguedad_horas: float) -> tuple[float, str, str]:
    prob_demora, fuente = predecir_demora(ctx)
    # Normalizar antigüedad (0..1) con tope de 72h.
    ant_norm = min(max(antiguedad_horas, 0.0), 72.0) / 72.0
    score = 0.6 * prob_demora + 0.4 * ant_norm
    nivel = "ALTA" if score >= 0.6 else "MEDIA" if score >= 0.35 else "BAJA"
    return round(score, 4), nivel, fuente


# ── Mejor ruta ───────────────────────────────────────────────────────────────
def recomendar_ruta(ctx: dict, candidatos: list[dict]) -> list[dict]:
    """Rankea asesores candidatos. Con modelo de duración estima por contexto;
    la carga actual de cada asesor desempata/ajusta (menos carga = mejor)."""
    base_dur, fuente = predecir_duracion(ctx)
    opciones = []
    for c in candidatos:
        carga = float(c.get("cargaActual", 0))
        # score = duración estimada + penalización por carga (cada tarea pendiente ~ +1h)
        score = base_dur + carga
        opciones.append({
            "asignadoA": c.get("asignadoA", ""),
            "duracionEstimadaHoras": round(base_dur, 2),
            "score": round(score, 2),
        })
    opciones.sort(key=lambda o: o["score"])
    return opciones
