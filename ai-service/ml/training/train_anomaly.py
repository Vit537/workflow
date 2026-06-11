"""Entrena el AUTOENCODER de detección de ANOMALÍAS (TensorFlow/Keras).

Aprende a reconstruir pasos "normales"; los pasos con error de reconstrucción alto
son anómalos. Entrada: ml/data/tramites_export.jsonl. Salida: ml/models/anomaly.keras

El vector de entrada = features del paso + duración normalizada (mismo orden que usa
app/adapters/ml/riesgo.detectar_anomalia).

Ejecutar desde ai-service/ (ver train_delay_risk.py para los pasos previos).
"""
from __future__ import annotations

import os
import sys

# Permite ejecutar `python ml/training/train_anomaly.py` desde ai-service/.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ml.training._dataset import DIR, construir_tablas

MODELO_OUT = os.path.join(DIR, "models", "anomaly.keras")


def main():
    import numpy as np
    import tensorflow as tf
    from tensorflow.keras import layers

    X, dur, _y = construir_tablas()
    dur_norm = np.clip(dur, 0, 500).reshape(-1, 1) / 24.0
    Xa = np.concatenate([X, dur_norm], axis=1).astype("float32")
    n_in = Xa.shape[1]
    print(f">> Muestras: {len(Xa)} | dim entrada: {n_in}")

    idx = np.random.RandomState(0).permutation(len(Xa))
    corte = int(len(Xa) * 0.8)
    tr, te = idx[:corte], idx[corte:]

    autoencoder = tf.keras.Sequential([
        tf.keras.Input(shape=(n_in,)),
        layers.Dense(16, activation="relu"),
        layers.Dense(6, activation="relu"),   # cuello de botella
        layers.Dense(16, activation="relu"),
        layers.Dense(n_in, activation="linear"),
    ])
    autoencoder.compile(optimizer="adam", loss="mse")
    autoencoder.fit(Xa[tr], Xa[tr], validation_data=(Xa[te], Xa[te]), epochs=30, batch_size=64)

    recon = autoencoder.predict(Xa[te], verbose=0)
    errores = np.mean((Xa[te] - recon) ** 2, axis=1)
    print(f">> Error reconstrucción test: media={errores.mean():.4f} p95={np.percentile(errores,95):.4f}")
    print(">> Sugerencia: usar el p95 como umbral en riesgo.detectar_anomalia (hoy 0.05).")

    os.makedirs(os.path.dirname(MODELO_OUT), exist_ok=True)
    autoencoder.save(MODELO_OUT)
    print(f">> Modelo guardado en {MODELO_OUT}")


if __name__ == "__main__":
    main()
