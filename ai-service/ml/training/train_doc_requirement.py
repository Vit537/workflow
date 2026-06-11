"""Entrena el clasificador multi-label de requerimiento de documentos (TensorFlow/Keras).

Entrada:  ml/data/doc_requirement_dataset.jsonl   (generar con gen_doc_requirement_dataset.py)
Salida:   ml/models/doc_requirement.keras          (lo carga app/adapters/nlp/doc_requirement.py)

Arquitectura (NLP con Deep Learning):
    TextVectorization → Embedding → GlobalAveragePooling1D → Dense → 6 salidas sigmoides
    (etiquetas: requiere, pdf, jpg, png, docx, xlsx)

Uso:
    pip install -r requirements-ml.txt
    python ml/data/gen_doc_requirement_dataset.py --n 4000
    python ml/training/train_doc_requirement.py

Nota: en Windows con Python 3.13 puede que TensorFlow no tenga wheel; se recomienda
Python 3.11/3.12 o Google Colab. El servicio funciona con heurística mientras tanto.
"""
from __future__ import annotations

import json
import os

ETIQUETAS = ["requiere", "pdf", "jpg", "png", "docx", "xlsx"]
DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../ml
DATASET = os.path.join(DIR, "data", "doc_requirement_dataset.jsonl")
MODELO_OUT = os.path.join(DIR, "models", "doc_requirement.keras")


def cargar_dataset(ruta: str):
    textos, etiquetas = [], []
    with open(ruta, encoding="utf-8") as f:
        for linea in f:
            r = json.loads(linea)
            textos.append(r["texto"])
            etiquetas.append([r[e] for e in ETIQUETAS])
    return textos, etiquetas


def main():
    import numpy as np
    import tensorflow as tf
    from tensorflow.keras import layers

    if not os.path.exists(DATASET):
        raise SystemExit(f"No existe {DATASET}. Genera el dataset primero (gen_doc_requirement_dataset.py).")

    textos, etiquetas = cargar_dataset(DATASET)
    X = np.array(textos)
    y = np.array(etiquetas, dtype="float32")

    # split simple 80/20
    n = len(X)
    idx = np.random.RandomState(0).permutation(n)
    corte = int(n * 0.8)
    tr, te = idx[:corte], idx[corte:]
    X_tr, X_te, y_tr, y_te = X[tr], X[te], y[tr], y[te]

    # Capa de vectorización de texto (queda DENTRO del modelo → recibe strings crudos)
    vectorizer = layers.TextVectorization(max_tokens=2000, output_sequence_length=20)
    vectorizer.adapt(X_tr)

    modelo = tf.keras.Sequential([
        tf.keras.Input(shape=(1,), dtype=tf.string),
        vectorizer,
        layers.Embedding(input_dim=2000, output_dim=24),
        layers.GlobalAveragePooling1D(),
        layers.Dense(32, activation="relu"),
        layers.Dropout(0.2),
        layers.Dense(len(ETIQUETAS), activation="sigmoid"),
    ])
    modelo.compile(optimizer="adam", loss="binary_crossentropy", metrics=["binary_accuracy"])
    modelo.summary()

    modelo.fit(X_tr, y_tr, validation_data=(X_te, y_te), epochs=12, batch_size=32)

    loss, acc = modelo.evaluate(X_te, y_te, verbose=0)
    print(f">> Test loss={loss:.4f} binary_accuracy={acc:.4f}")

    os.makedirs(os.path.dirname(MODELO_OUT), exist_ok=True)
    modelo.save(MODELO_OUT)
    print(f">> Modelo guardado en {MODELO_OUT}")

    # prueba rápida
    ejemplos = ["Adjuntar fotografía del carnet", "Registrar el nombre del cliente",
                "Subir comprobante de pago en PDF"]
    probs = modelo.predict(np.array(ejemplos), verbose=0)
    for t, p in zip(ejemplos, probs):
        print(t, "→", {e: round(float(x), 2) for e, x in zip(ETIQUETAS, p)})


if __name__ == "__main__":
    main()
