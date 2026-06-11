"""Genera un dataset etiquetado para el clasificador de requerimiento de documentos.

Cada ejemplo: texto de una actividad → etiquetas multi-label:
    requiere (0/1), pdf, jpg, png, docx, xlsx

Salida: ml/data/doc_requirement_dataset.jsonl  (una línea JSON por ejemplo)

Uso:
    python ml/data/gen_doc_requirement_dataset.py --n 4000
"""
from __future__ import annotations

import argparse
import json
import os
import random

SEED = 7
random.seed(SEED)

# Plantillas que SÍ requieren documentos, agrupadas por tipo dominante.
PLANTILLAS_DOC = {
    "imagen": [
        "Adjuntar fotografía del carnet de identidad",
        "Subir foto del rostro del cliente (selfie)",
        "Cargar imagen escaneada de la cédula",
        "Tomar y adjuntar foto del comprobante físico",
        "Subir fotografía del domicilio",
        "Adjuntar captura del carnet por ambos lados",
    ],
    "pdf": [
        "Adjuntar comprobante de pago en PDF",
        "Subir certificado de trabajo",
        "Cargar el contrato firmado",
        "Presentar factura de compra",
        "Adjuntar estado de cuenta bancario",
        "Subir constancia de domicilio",
        "Adjuntar declaración jurada de ingresos",
        "Cargar el extracto bancario de los últimos 3 meses",
    ],
    "docx": [
        "Adjuntar carta de solicitud",
        "Subir el currículum vitae del postulante",
        "Cargar la hoja de vida actualizada",
        "Presentar oficio dirigido a gerencia",
    ],
    "xlsx": [
        "Subir la planilla de empleados en Excel",
        "Adjuntar el presupuesto en hoja de cálculo",
        "Cargar la nómina mensual",
        "Adjuntar balance en formato Excel",
    ],
}

# Plantillas que NO requieren documentos (solo captura de datos).
PLANTILLAS_SIN_DOC = [
    "Registrar el nombre completo del cliente",
    "Capturar el número de teléfono de contacto",
    "Seleccionar el tipo de cuenta deseado",
    "Ingresar la dirección de correo electrónico",
    "Confirmar los datos personales",
    "Elegir la fecha de la cita",
    "Indicar el monto solicitado",
    "Marcar si acepta los términos y condiciones",
    "Asignar el caso a un asesor disponible",
    "Revisar y aprobar la solicitud en el sistema",
    "Registrar observaciones del proceso",
    "Validar los datos ingresados por el cliente",
]

PREFIJOS = ["", "Paso: ", "Actividad: ", "El cliente debe ", "Se requiere ", "Por favor "]

EXT_DE_TIPO = {
    "imagen": ["jpg", "png"],
    "pdf": ["pdf"],
    "docx": ["pdf", "docx"],
    "xlsx": ["xlsx"],
}
COLUMNAS = ["requiere", "pdf", "jpg", "png", "docx", "xlsx"]


def _fila(texto: str, requiere: int, exts: list[str]) -> dict:
    d = {c: 0 for c in COLUMNAS}
    d["requiere"] = requiere
    for e in exts:
        if e in d:
            d[e] = 1
    return {"texto": texto, **d}


def generar(n: int) -> list[dict]:
    filas = []
    for _ in range(n):
        if random.random() < 0.55:  # ejemplos con documento
            tipo = random.choice(list(PLANTILLAS_DOC.keys()))
            base = random.choice(PLANTILLAS_DOC[tipo])
            texto = random.choice(PREFIJOS) + base
            filas.append(_fila(texto, 1, EXT_DE_TIPO[tipo]))
        else:  # ejemplos sin documento
            base = random.choice(PLANTILLAS_SIN_DOC)
            texto = random.choice(PREFIJOS) + base
            filas.append(_fila(texto, 0, []))
    random.shuffle(filas)
    return filas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=4000)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "doc_requirement_dataset.jsonl"))
    args = ap.parse_args()

    filas = generar(args.n)
    with open(args.out, "w", encoding="utf-8") as f:
        for fila in filas:
            f.write(json.dumps(fila, ensure_ascii=False) + "\n")

    pos = sum(r["requiere"] for r in filas)
    print(f">> {len(filas)} ejemplos escritos en {args.out}")
    print(f">> requiere=1: {pos} ({pos/len(filas):.0%}) | requiere=0: {len(filas)-pos}")


if __name__ == "__main__":
    main()
