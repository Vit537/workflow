"""Entrena el clasificador de RIESGO DE DEMORA (TensorFlow/Keras).

Entrada:  ml/data/tramites_export.jsonl
Salida:   ml/models/delay_risk.keras   (clasificación binaria: P(demora))

Ejecutar desde ai-service/:
    pip install -r requirements-ml.txt
    python ml/data/seed_mongo.py --tramites 1500
    python ml/data/export_tramites.py
    python ml/training/train_delay_risk.py
"""
from __future__ import annotations

import os
import sys

# Permite ejecutar `python ml/training/train_delay_risk.py` desde ai-service/.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ml.training._dataset import DIR, construir_tablas

MODELO_OUT = os.path.join(DIR, "models", "delay_risk.keras")


def main():
    import numpy as np
    import tensorflow as tf
    from tensorflow.keras import layers

    X, _dur, y = construir_tablas()
    print(f">> Muestras: {len(X)} | features: {X.shape[1]} | tasa demora: {y.mean():.2%}")

    idx = np.random.RandomState(0).permutation(len(X))
    corte = int(len(X) * 0.8)
    tr, te = idx[:corte], idx[corte:]

    modelo = tf.keras.Sequential([
        tf.keras.Input(shape=(X.shape[1],)),
        layers.Dense(32, activation="relu"),
        layers.Dropout(0.2),
        layers.Dense(16, activation="relu"),
        layers.Dense(1, activation="sigmoid"),
    ])
    modelo.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
    modelo.fit(X[tr], y[tr], validation_data=(X[te], y[te]), epochs=20, batch_size=64)

    loss, acc = modelo.evaluate(X[te], y[te], verbose=0)
    print(f">> Test accuracy={acc:.4f}")

    os.makedirs(os.path.dirname(MODELO_OUT), exist_ok=True)
    modelo.save(MODELO_OUT)
    print(f">> Modelo guardado en {MODELO_OUT}")


if __name__ == "__main__":
    main()
