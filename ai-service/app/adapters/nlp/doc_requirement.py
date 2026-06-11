"""Clasificador NLP: ¿esta actividad requiere documentos? ¿de qué tipo?

Predice (requiereDocumentos, tiposPermitidos, maxArchivos) a partir del texto de
una actividad/formulario. Se usa para VALIDAR y CORREGIR lo que devuelve el LLM
al generar el diagrama (Área 1 de la mejora).

Diseño en dos niveles:
  1) Heurística por palabras clave en español → funciona ya, sin dependencias pesadas.
  2) (Opcional) modelo TensorFlow entrenado en `ml/models/doc_requirement.keras`.
     Si está presente y TensorFlow disponible, se usa para refinar; si no, heurística.

Así el servicio NO depende de TensorFlow para funcionar, pero queda listo para
incorporar el modelo entrenado (ver ml/training/train_doc_requirement.py).
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field

from app.adapters.nlp.preprocess import normalizar

log = logging.getLogger(__name__)

# Extensiones soportadas (coinciden con tiposPermitidos del modelo Java)
EXT_IMAGEN = ["jpg", "png"]
EXT_PDF = ["pdf"]
EXT_DOCX = ["pdf", "docx"]
EXT_XLSX = ["xlsx"]

# Orden de etiquetas de salida del modelo TensorFlow (ver ml/training/train_doc_requirement.py)
ETIQUETAS_MODELO = ["requiere", "pdf", "jpg", "png", "docx", "xlsx"]

# Palabras que indican que el cliente debe ENTREGAR/ADJUNTAR algo.
INTENCION_SUBIR = {
    "adjuntar", "adjunte", "adjunta", "subir", "suba", "cargar", "cargue",
    "presentar", "presente", "anexar", "anexe", "entregar", "entregue",
    "fotocopia", "escanear", "escaneo", "escaneado", "copia de", "documento",
    "documentos", "archivo", "archivos", "respaldo", "comprobante", "comprobantes",
    "certificado", "certificados", "constancia", "verificar documento", "validar documento",
}

# Palabras → tipo de archivo
MAPA_TIPOS: list[tuple[set[str], list[str]]] = [
    (
        {"foto", "fotografia", "imagen", "imagenes", "selfie", "carnet", "cedula",
         "ci", "escaneo", "escaneado", "captura", "fotocopia", "rostro"},
        EXT_IMAGEN,
    ),
    (
        {"comprobante", "certificado", "contrato", "factura", "boleta", "recibo",
         "estado de cuenta", "extracto", "constancia", "declaracion", "poliza",
         "titulo", "escritura", "acta", "documento firmado", "formulario firmado",
         "respaldo", "nota", "informe"},
        EXT_PDF,
    ),
    (
        {"carta", "curriculum", "cv", "hoja de vida", "oficio", "solicitud escrita"},
        EXT_DOCX,
    ),
    (
        {"planilla", "excel", "hoja de calculo", "balance", "presupuesto", "nomina"},
        EXT_XLSX,
    ),
]


@dataclass
class Prediccion:
    requiereDocumentos: bool = False
    tiposPermitidos: list[str] = field(default_factory=list)
    maxArchivos: int | None = None
    fuente: str = "heuristica"  # "heuristica" | "modelo"


# ── Heurística ───────────────────────────────────────────────────────────────

def _predecir_heuristica(texto: str, n_requisitos: int = 0) -> Prediccion:
    t = normalizar(texto)
    if not t:
        return Prediccion()

    tipos: list[str] = []
    for palabras, ext in MAPA_TIPOS:
        if any(p in t for p in palabras):
            for e in ext:
                if e not in tipos:
                    tipos.append(e)

    intencion = any(p in t for p in INTENCION_SUBIR)
    requiere = bool(tipos) or intencion or n_requisitos > 0

    if requiere and not tipos:
        tipos = list(EXT_PDF)  # por defecto, un documento es un PDF

    max_archivos = None
    if requiere:
        max_archivos = min(5, max(1, n_requisitos or 1))

    return Prediccion(
        requiereDocumentos=requiere,
        tiposPermitidos=tipos,
        maxArchivos=max_archivos,
        fuente="heuristica",
    )


# ── Modelo TensorFlow (opcional, carga perezosa) ─────────────────────────────

_MODELO = None  # se carga una sola vez
_MODELO_INTENTADO = False
_RUTA_MODELO = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "ml", "models", "doc_requirement.keras"
)


def _cargar_modelo():
    global _MODELO, _MODELO_INTENTADO
    if _MODELO_INTENTADO:
        return _MODELO
    _MODELO_INTENTADO = True
    ruta = os.path.abspath(_RUTA_MODELO)
    if not os.path.exists(ruta):
        log.info("Modelo doc_requirement no encontrado (%s); usando heurística.", ruta)
        return None
    try:
        import tensorflow as tf  # import perezoso: no se exige TF para servir
        _MODELO = tf.keras.models.load_model(ruta)
        log.info("Modelo doc_requirement cargado desde %s", ruta)
    except Exception as exc:  # noqa: BLE001
        log.warning("No se pudo cargar el modelo doc_requirement (%s); usando heurística.", exc)
        _MODELO = None
    return _MODELO


# ── API pública ──────────────────────────────────────────────────────────────

def _predecir_modelo(texto: str) -> Prediccion | None:
    """Usa el modelo TensorFlow si está cargado. Devuelve None si no aplica/falla."""
    modelo = _cargar_modelo()
    if modelo is None:
        return None
    try:
        probs = modelo.predict([texto], verbose=0)[0]
        d = {et: float(p) for et, p in zip(ETIQUETAS_MODELO, probs)}
        requiere = d.get("requiere", 0.0) >= 0.5
        if not requiere:
            return Prediccion(requiereDocumentos=False, tiposPermitidos=[], maxArchivos=None, fuente="modelo")
        tipos = [ext for ext in ("pdf", "jpg", "png", "docx", "xlsx") if d.get(ext, 0.0) >= 0.5]
        if not tipos:
            tipos = list(EXT_PDF)
        return Prediccion(requiereDocumentos=True, tiposPermitidos=tipos, maxArchivos=3, fuente="modelo")
    except Exception as exc:  # noqa: BLE001
        log.warning("Falló la predicción del modelo doc_requirement (%s); usando heurística.", exc)
        return None


def predecir(texto: str, n_requisitos: int = 0) -> Prediccion:
    """Predice el requerimiento de documentos para una actividad.

    Usa el modelo TensorFlow si está entrenado/disponible; si no, la heurística
    (que ya da buenos resultados y no requiere dependencias pesadas).
    """
    pred = _predecir_modelo(texto)
    if pred is not None:
        return pred
    return _predecir_heuristica(texto, n_requisitos)


def enriquecer_formulario(formulario) -> None:
    """Valida/corrige IN-PLACE los campos de documentos de un FormularioIA.

    Combina lo que produjo el LLM con la predicción NLP: si cualquiera detecta
    que se requieren documentos, se marca; se unen los tipos sugeridos.
    """
    texto = " ".join(
        filter(
            None,
            [
                getattr(formulario, "titulo", "") or "",
                getattr(formulario, "instrucciones", "") or "",
                " ".join(getattr(formulario, "requisitos", []) or []),
            ],
        )
    )
    n_req = len(getattr(formulario, "requisitos", []) or [])
    pred = predecir(texto, n_requisitos=n_req)

    requiere_final = bool(getattr(formulario, "requiereDocumentos", False)) or pred.requiereDocumentos

    tipos_actuales = list(getattr(formulario, "tiposPermitidos", []) or [])
    if requiere_final:
        for e in pred.tiposPermitidos:
            if e not in tipos_actuales:
                tipos_actuales.append(e)
        if not tipos_actuales:
            tipos_actuales = list(EXT_PDF)
    else:
        tipos_actuales = []

    formulario.requiereDocumentos = requiere_final
    formulario.tiposPermitidos = tipos_actuales
    if requiere_final and not getattr(formulario, "maxArchivos", None):
        formulario.maxArchivos = pred.maxArchivos or 3
    if not requiere_final:
        formulario.maxArchivos = None
