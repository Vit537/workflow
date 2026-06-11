"""Ingeniería de características para el motor de riesgo (compartida servir/entrenar).

Vive en el paquete `app` (se despliega) para que tanto el servicio como los scripts
de entrenamiento (`ml/training/*.py`) usen EXACTAMENTE el mismo vector de features.

El vocabulario (políticas, carriles) y las horas base reflejan el dominio del seed
(`ml/data/seed_mongo.py`). Para datos nuevos con otras políticas, ampliar estas listas.
"""
from __future__ import annotations

import math

# ── Vocabulario del dominio ──────────────────────────────────────────────────
POLITICAS = [
    "Apertura de Cuenta Bancaria",
    "Solicitud de Prestamo",
    "Reclamo de Tarjeta",
    "Alta de Seguro",
    "Onboarding de Empleado",
]

CARRILES = [
    "Cajero", "Verificacion", "Gerencia", "Asesor", "Riesgo", "Atencion",
    "Operaciones", "Agente", "Suscripcion", "RRHH", "TI", "Logistica",
]

# Horas base esperadas por (política, etiqueta de paso). Mirror del seed.
BASE_HORAS = {
    ("Apertura de Cuenta Bancaria", "Recepcion de solicitud"): 2.0,
    ("Apertura de Cuenta Bancaria", "Verificacion de identidad"): 4.0,
    ("Apertura de Cuenta Bancaria", "Validacion de documentos"): 6.0,
    ("Apertura de Cuenta Bancaria", "Aprobacion de apertura"): 8.0,
    ("Apertura de Cuenta Bancaria", "Activacion de cuenta"): 3.0,
    ("Solicitud de Prestamo", "Registro de solicitud"): 3.0,
    ("Solicitud de Prestamo", "Analisis de capacidad de pago"): 12.0,
    ("Solicitud de Prestamo", "Evaluacion de riesgo crediticio"): 16.0,
    ("Solicitud de Prestamo", "Aprobacion del comite"): 10.0,
    ("Solicitud de Prestamo", "Desembolso"): 4.0,
    ("Reclamo de Tarjeta", "Registro del reclamo"): 2.0,
    ("Reclamo de Tarjeta", "Investigacion del caso"): 24.0,
    ("Reclamo de Tarjeta", "Resolucion y respuesta"): 5.0,
    ("Alta de Seguro", "Cotizacion"): 3.0,
    ("Alta de Seguro", "Evaluacion de suscripcion"): 10.0,
    ("Alta de Seguro", "Emision de poliza"): 5.0,
    ("Onboarding de Empleado", "Registro de datos"): 3.0,
    ("Onboarding de Empleado", "Creacion de cuentas"): 6.0,
    ("Onboarding de Empleado", "Entrega de equipo"): 8.0,
    ("Onboarding de Empleado", "Induccion"): 4.0,
}

HORAS_BASE_DEFECTO = 6.0
FACTOR_SLA = 1.5  # un paso "demora" si supera base * FACTOR_SLA


def horas_base(politica: str, etiqueta: str) -> float:
    return BASE_HORAS.get((politica, etiqueta), HORAS_BASE_DEFECTO)


def sla_horas(politica: str, etiqueta: str) -> float:
    return horas_base(politica, etiqueta) * FACTOR_SLA


# ── Flags derivados ──────────────────────────────────────────────────────────
def es_pico(hora: int) -> int:
    return 1 if (9 <= hora <= 12 or 15 <= hora <= 17) else 0


def es_lunes_martes(dia: int) -> int:
    return 1 if dia in (0, 1) else 0


def es_finde(dia: int) -> int:
    return 1 if dia in (5, 6) else 0


def _one_hot(valor: str, vocab: list[str]) -> list[float]:
    return [1.0 if valor == v else 0.0 for v in vocab]


# ── Vector de features ───────────────────────────────────────────────────────
def construir_vector(ctx: dict) -> list[float]:
    """ctx: {nombrePolitica, etiquetaNodo, carrilNombre, horaInicio, diaSemana, indicePaso}."""
    politica = ctx.get("nombrePolitica", "")
    etiqueta = ctx.get("etiquetaNodo", "")
    carril = ctx.get("carrilNombre", "")
    hora = int(ctx.get("horaInicio", 9))
    dia = int(ctx.get("diaSemana", 2))
    indice = int(ctx.get("indicePaso", 0))
    base = horas_base(politica, etiqueta)

    numericas = [
        hora / 23.0,
        dia / 6.0,
        float(es_pico(hora)),
        float(es_lunes_martes(dia)),
        float(es_finde(dia)),
        min(base, 24.0) / 24.0,
        min(indice, 10) / 10.0,
    ]
    return numericas + _one_hot(carril, CARRILES) + _one_hot(politica, POLITICAS)


def feature_names() -> list[str]:
    base = ["hora", "dia", "es_pico", "es_lunes_martes", "es_finde", "base_horas", "indice_paso"]
    return base + [f"carril_{c}" for c in CARRILES] + [f"pol_{p}" for p in POLITICAS]


N_FEATURES = len(feature_names())


# ── Construcción de filas de entrenamiento desde un trámite ──────────────────
def _hora_dia(iso_o_dt) -> tuple[int, int]:
    from datetime import datetime
    if iso_o_dt is None:
        return 9, 2
    if isinstance(iso_o_dt, str):
        try:
            dt = datetime.fromisoformat(iso_o_dt.replace("Z", "+00:00"))
        except Exception:  # noqa: BLE001
            return 9, 2
    else:
        dt = iso_o_dt
    return dt.hour, dt.weekday()


def _duracion_horas(asignado, completado) -> float | None:
    from datetime import datetime
    def _p(x):
        if x is None:
            return None
        if isinstance(x, str):
            try:
                return datetime.fromisoformat(x.replace("Z", "+00:00"))
            except Exception:  # noqa: BLE001
                return None
        return x
    a, c = _p(asignado), _p(completado)
    if a is None or c is None:
        return None
    return (c - a).total_seconds() / 3600.0


def filas_de_tramite(tramite: dict):
    """Genera (features, duracion_horas, demora_label) por cada paso COMPLETADO del trámite."""
    politica = tramite.get("nombrePolitica", "")
    filas = []
    for idx, paso in enumerate(tramite.get("pasos", [])):
        if paso.get("completadoEn") is None:
            continue
        dur = _duracion_horas(paso.get("asignadoEn"), paso.get("completadoEn"))
        if dur is None or dur <= 0:
            continue
        hora, dia = _hora_dia(paso.get("asignadoEn"))
        ctx = {
            "nombrePolitica": politica,
            "etiquetaNodo": paso.get("etiquetaNodo", ""),
            "carrilNombre": paso.get("carrilNombre", ""),
            "horaInicio": hora,
            "diaSemana": dia,
            "indicePaso": idx,
        }
        vector = construir_vector(ctx)
        demora = 1 if dur > sla_horas(politica, paso.get("etiquetaNodo", "")) else 0
        filas.append((vector, dur, demora))
    return filas
