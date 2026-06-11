"""Entrenamiento de los modelos de riesgo desde la aplicación (sin comandos).

Lee los trámites de MongoDB, entrena los 3 modelos (delay_risk, duration, anomaly),
los guarda en ml/models/ y refresca la caché del model_registry. Corre en un hilo
en background y expone el estado para que el frontend lo muestre.

Requisitos en runtime: tensorflow + pymongo (ver requirements.txt).
"""
from __future__ import annotations

import logging
import os
import threading
from datetime import datetime, timezone

from app.adapters.ml import features as F
from app.adapters.ml import model_registry
from app.core.config import settings

log = logging.getLogger(__name__)

_DIR_MODELOS = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "models")
)

_estado: dict = {
    "estado": "IDLE",      # IDLE | ENTRENANDO | OK | ERROR
    "mensaje": "",
    "metricas": {},
    "fecha": None,
    "tramites": 0,
}
_lock = threading.Lock()


def estado() -> dict:
    return dict(_estado)


def _leer_tramites() -> list[dict]:
    from pymongo import MongoClient
    client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
    db = client.get_default_database()
    return list(db.tramites.find({}))


def _entrenar_sync() -> None:
    try:
        import numpy as np
        import tensorflow as tf
        from tensorflow.keras import layers

        tramites = _leer_tramites()
        X, dur, dem = [], [], []
        for t in tramites:
            for v, d, m in F.filas_de_tramite(t):
                X.append(v)
                dur.append(d)
                dem.append(m)

        if len(X) < 50:
            _estado.update(estado="ERROR",
                           mensaje=f"Datos insuficientes ({len(X)} muestras). Se necesitan al menos 50.")
            return

        X = np.array(X, dtype="float32")
        dur = np.array(dur, dtype="float32")
        dem = np.array(dem, dtype="float32")
        os.makedirs(_DIR_MODELOS, exist_ok=True)

        # 1) Riesgo de demora (clasificador binario)
        m1 = tf.keras.Sequential([
            tf.keras.Input(shape=(X.shape[1],)),
            layers.Dense(32, activation="relu"), layers.Dropout(0.2),
            layers.Dense(16, activation="relu"), layers.Dense(1, activation="sigmoid"),
        ])
        m1.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
        h1 = m1.fit(X, dem, epochs=20, batch_size=64, verbose=0, validation_split=0.2)
        acc = float(h1.history["val_accuracy"][-1])
        m1.save(os.path.join(_DIR_MODELOS, "delay_risk.keras"))

        # 2) Duración (regresor sobre log1p(horas); el servicio aplica expm1)
        y = np.log1p(dur)
        m2 = tf.keras.Sequential([
            tf.keras.Input(shape=(X.shape[1],)),
            layers.Dense(32, activation="relu"), layers.Dropout(0.2),
            layers.Dense(16, activation="relu"), layers.Dense(1, activation="softplus"),
        ])
        m2.compile(optimizer="adam", loss="mse", metrics=["mae"])
        m2.fit(X, y, epochs=25, batch_size=64, verbose=0, validation_split=0.2)
        pred = np.expm1(m2.predict(X, verbose=0).ravel())
        mae = float(np.mean(np.abs(pred - dur)))
        m2.save(os.path.join(_DIR_MODELOS, "duration.keras"))

        # 3) Anomalías (autoencoder; entrada = features + duración normalizada)
        dn = np.clip(dur, 0, 500).reshape(-1, 1) / 24.0
        Xa = np.concatenate([X, dn], axis=1).astype("float32")
        n_in = Xa.shape[1]
        ae = tf.keras.Sequential([
            tf.keras.Input(shape=(n_in,)),
            layers.Dense(16, activation="relu"), layers.Dense(6, activation="relu"),
            layers.Dense(16, activation="relu"), layers.Dense(n_in, activation="linear"),
        ])
        ae.compile(optimizer="adam", loss="mse")
        ae.fit(Xa, Xa, epochs=30, batch_size=64, verbose=0, validation_split=0.2)
        ae.save(os.path.join(_DIR_MODELOS, "anomaly.keras"))

        model_registry.refrescar()
        _estado.update(
            estado="OK",
            mensaje="Entrenamiento completado correctamente.",
            metricas={"accuracyDemora": round(acc, 4), "maeDuracionHoras": round(mae, 2),
                      "muestras": int(len(X))},
            fecha=datetime.now(timezone.utc).isoformat(),
            tramites=len(tramites),
        )
        log.info("Entrenamiento OK: %s", _estado["metricas"])
    except Exception as exc:  # noqa: BLE001
        log.exception("Error durante el entrenamiento")
        _estado.update(estado="ERROR", mensaje=str(exc))


def lanzar() -> dict:
    """Lanza el entrenamiento en background (si no hay otro en curso)."""
    with _lock:
        if _estado["estado"] == "ENTRENANDO":
            return estado()
        _estado.update(estado="ENTRENANDO", mensaje="Entrenando modelos…", metricas={})
    threading.Thread(target=_entrenar_sync, daemon=True).start()
    return estado()
