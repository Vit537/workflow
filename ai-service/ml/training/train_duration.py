"""Entrena el regresor de DURACIÓN de un paso (TensorFlow/Keras).

Se usa para 'mejor ruta' (elegir asesor con menor duración estimada) y como insumo
de la prioridad. Entrada: ml/data/tramites_export.jsonl. Salida: ml/models/duration.keras

Ejecutar desde ai-service/ (ver train_delay_risk.py para los pasos previos).
"""
from __future__ import annotations

import os
import sys

# Permite ejecutar `python ml/training/train_duration.py` desde ai-service/.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ml.training._dataset import DIR, construir_tablas

MODELO_OUT = os.path.join(DIR, "models", "duration.keras")


def main():
    import numpy as np
    import tensorflow as tf
    from tensorflow.keras import layers

    X, dur, _y = construir_tablas()
    # Entrenamos en log(1+horas) para estabilizar la cola de valores grandes.
    y = np.log1p(dur)
    print(f">> Muestras: {len(X)} | duración media: {dur.mean():.1f}h")

    idx = np.random.RandomState(0).permutation(len(X))
    corte = int(len(X) * 0.8)
    tr, te = idx[:corte], idx[corte:]

    modelo = tf.keras.Sequential([
        tf.keras.Input(shape=(X.shape[1],)),
        layers.Dense(32, activation="relu"),
        layers.Dropout(0.2),
        layers.Dense(16, activation="relu"),
        layers.Dense(1, activation="softplus"),  # duración (log) no negativa
    ])
    modelo.compile(optimizer="adam", loss="mse", metrics=["mae"])
    modelo.fit(X[tr], y[tr], validation_data=(X[te], y[te]), epochs=25, batch_size=64)

    # MAE en horas reales
    pred = np.expm1(modelo.predict(X[te], verbose=0).ravel())
    mae_h = float(np.mean(np.abs(pred - dur[te])))
    print(f">> Test MAE={mae_h:.2f} horas")

    os.makedirs(os.path.dirname(MODELO_OUT), exist_ok=True)
    # El modelo predice log(1+horas); el servicio aplica expm1 al servir
    # (evitamos una capa Lambda, que Keras bloquea al cargar por seguridad).
    modelo.save(MODELO_OUT)
    print(f">> Modelo guardado en {MODELO_OUT} (salida en log1p de horas)")


if __name__ == "__main__":
    main()
