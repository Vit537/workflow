from __future__ import annotations

import os
import uuid
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

load_dotenv()

# ── Configuración ──────────────────────────────────────────────────────────────

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-8b-8192")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:4200").split(",")

app = FastAPI(title="Workflow AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Modelos Pydantic de salida ──────────────────────────────────────────────────

class CarrilIA(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    nombre: str
    orden: int

class NodoIA(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    carrilId: str
    etiqueta: str
    tipo: str  # INICIO | FIN | ACTIVIDAD | DECISION | COMPUERTA_PARALELA | COMPUERTA_UNION
    tipoFlujo: str = "LINEAL"  # LINEAL | CONDICIONAL | ITERATIVO | PARALELO
    posX: float = 50.0
    posY: float = 50.0
    ancho: float = 120.0
    alto: float = 50.0
    condiciones: list[str] = Field(default_factory=list)

class ConexionIA(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    nodoOrigenId: str
    nodoDestinoId: str
    etiqueta: Optional[str] = None

class DiagramaIA(BaseModel):
    carriles: list[CarrilIA]
    nodos: list[NodoIA]
    conexiones: list[ConexionIA]

# ── Modelos de request/response ────────────────────────────────────────────────

class SolicitudGenerarDiagrama(BaseModel):
    prompt: str = Field(..., min_length=10, description="Instrucción en lenguaje natural")

class RespuestaGenerarDiagrama(BaseModel):
    diagrama: DiagramaIA
    descripcion: str

# ── Prompt template ────────────────────────────────────────────────────────────

SCHEMA_JSON = """\
{
  "carriles": [
    {"id": "<uuid8>", "nombre": "<nombre del departamento>", "orden": 0}
  ],
  "nodos": [
    {
      "id": "<uuid8>",
      "carrilId": "<id del carril>",
      "etiqueta": "<nombre del paso>",
      "tipo": "INICIO|FIN|ACTIVIDAD|DECISION|COMPUERTA_PARALELA|COMPUERTA_UNION",
      "tipoFlujo": "LINEAL|CONDICIONAL|ITERATIVO|PARALELO",
      "posX": <numero>,
      "posY": <numero>,
      "ancho": <numero>,
      "alto": <numero>,
      "condiciones": ["<rama1>", "<rama2>"]
    }
  ],
  "conexiones": [
    {"id": "<uuid8>", "nodoOrigenId": "<id>", "nodoDestinoId": "<id>", "etiqueta": "<opcional>"}
  ]
}"""

SYSTEM_PROMPT = """\
Eres un experto en diseño de procesos de negocio tipo BPMN con diagramas swimlane.
Tu tarea es convertir una descripción en lenguaje natural en un diagrama swimlane estructurado en JSON.

Reglas estrictas:
1. SIEMPRE incluye exactamente un nodo de tipo INICIO y al menos un nodo de tipo FIN.
2. Cada nodo pertenece a un carril (carrilId debe coincidir exactamente con el id de un carril).
3. Cada carril representa un departamento, área o actor responsable.
4. Las conexiones deben formar un camino continuo desde INICIO hasta FIN.
5. Usa tipo DECISION + tipoFlujo CONDICIONAL cuando el flujo se bifurca.
6. Usa COMPUERTA_PARALELA y COMPUERTA_UNION para ramas paralelas.
7. Los ids deben ser strings cortos únicos (8 caracteres alfanuméricos).
8. posX y posY deben distribuir los nodos visualmente (incrementa posX ~150 entre nodos del mismo carril).
9. nodos INICIO y FIN tienen ancho=40, alto=40. DECISION tiene ancho=80, alto=60. El resto ancho=120, alto=50.
10. condiciones solo se rellena cuando tipoFlujo es CONDICIONAL o ITERATIVO.

Devuelve ÚNICAMENTE el JSON válido con la siguiente estructura, sin texto adicional ni bloques markdown:\n""" + SCHEMA_JSON

HUMAN_PROMPT = "Genera el diagrama swimlane para el siguiente proceso:\n\n{prompt}"

prompt_template = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", HUMAN_PROMPT),
])

# ── LLM ───────────────────────────────────────────────────────────────────────

def obtener_llm() -> ChatGroq:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY no configurada")
    return ChatGroq(
        api_key=GROQ_API_KEY,
        model=GROQ_MODEL,
        temperature=0.2,
    )

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"estado": "ok", "modelo": GROQ_MODEL}


@app.post("/api/ia/generar-diagrama", response_model=RespuestaGenerarDiagrama)
async def generar_diagrama(solicitud: SolicitudGenerarDiagrama):
    llm = obtener_llm()
    chain = prompt_template | llm

    try:
        resultado = await chain.ainvoke({"prompt": solicitud.prompt})
        contenido: str = resultado.content.strip()

        # Limpiar si el modelo devuelve bloques markdown
        if contenido.startswith("```"):
            lineas = contenido.splitlines()
            contenido = "\n".join(
                l for l in lineas if not l.startswith("```")
            ).strip()

        import json
        datos = json.loads(contenido)
        diagrama = DiagramaIA(**datos)

    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"El modelo devolvió JSON inválido: {exc}",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return RespuestaGenerarDiagrama(
        diagrama=diagrama,
        descripcion=f"Diagrama generado desde: \"{solicitud.prompt[:80]}\"",
    )
