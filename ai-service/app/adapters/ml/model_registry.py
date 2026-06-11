"""Carga perezosa y caché de modelos TensorFlow (.keras).

Cargar un modelo es costoso: se hace UNA sola vez (al primer uso) y se cachea.
Si TensorFlow no está instalado o el archivo no existe, devuelve None y el servicio
usa la heurística. Así el ai-service NO depende de TensorFlow para funcionar.
"""
from __future__ import annotations

import logging
import os

log = logging.getLogger(__name__)

_DIR_MODELOS = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "models")
)

_cache: dict[str, object] = {}
_intentado: set[str] = set()


def refrescar() -> None:
    """Limpia la caché para que los modelos se recarguen (tras reentrenar)."""
    _cache.clear()
    _intentado.clear()
    log.info("Caché de modelos refrescada.")


def obtener_modelo(nombre: str):
    """Devuelve el modelo Keras `<nombre>.keras` (cacheado) o None si no está disponible."""
    if nombre in _cache:
        return _cache[nombre]
    if nombre in _intentado:
        return None
    _intentado.add(nombre)

    ruta = os.path.join(_DIR_MODELOS, f"{nombre}.keras")
    if not os.path.exists(ruta):
        log.info("Modelo '%s' no encontrado (%s); se usará heurística.", nombre, ruta)
        return None
    try:
        import tensorflow as tf  # import perezoso
        modelo = tf.keras.models.load_model(ruta)
        _cache[nombre] = modelo
        log.info("Modelo '%s' cargado desde %s", nombre, ruta)
        return modelo
    except Exception as exc:  # noqa: BLE001
        log.warning("No se pudo cargar el modelo '%s' (%s); se usará heurística.", nombre, exc)
        return None
