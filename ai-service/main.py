from __future__ import annotations

import json
import os
import re
import uuid
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq as GroqClient
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic import ConfigDict
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

load_dotenv()

# ── Configuración ──────────────────────────────────────────────────────────────

# API key para el agente de políticas (creación de diagramas)
GROQ_API_KEY_POLICY = os.getenv("GROQ_API_KEY_POLICY", "")
# API key para el chatbot y reportes dinámicos
GROQ_API_KEY_CHAT = os.getenv("GROQ_API_KEY_CHAT", "")

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:4200").split(",")

app = FastAPI(title="Workflow AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    import logging
    logging.error(f"[422] Validation error: {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# ── Modelos Pydantic de salida ──────────────────────────────────────────────────

class CarrilIA(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    nombre: str
    orden: int

class CampoIA(BaseModel):
    model_config = ConfigDict(extra='ignore')
    nombre: str
    etiqueta: str
    tipoCampo: str = "TEXTO"   # TEXTO | NUMERO | FECHA | BOOLEANO | SELECCION
    requerido: bool = False

    @field_validator('tipoCampo', mode='before')
    @classmethod
    def tipoCampo_valido(cls, v: Any) -> str:
        validos = {"TEXTO", "NUMERO", "FECHA", "BOOLEANO", "SELECCION"}
        return v if v in validos else "TEXTO"


class FormularioIA(BaseModel):
    model_config = ConfigDict(extra='ignore')
    titulo: str
    instrucciones: str = ""
    requisitos: list[str] = Field(default_factory=list)
    campos: list[CampoIA] = Field(default_factory=list)

    @field_validator('requisitos', mode='before')
    @classmethod
    def requisitos_no_null(cls, v: Any) -> list[str]:
        return v if isinstance(v, list) else []

    @field_validator('campos', mode='before')
    @classmethod
    def campos_no_null(cls, v: Any) -> list:
        return v if isinstance(v, list) else []


class NodoIA(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    carrilId: str
    etiqueta: str
    tipo: str
    tipoFlujo: Optional[str] = "LINEAL"
    posX: Optional[float] = 50.0
    posY: Optional[float] = 50.0
    ancho: Optional[float] = 120.0
    alto: Optional[float] = 50.0
    condiciones: Optional[list[str]] = Field(default_factory=list)
    formulario: Optional[FormularioIA] = None

    @field_validator('condiciones', mode='before')
    @classmethod
    def condiciones_no_null(cls, v: Any) -> list[str]:
        return v if isinstance(v, list) else []

    @field_validator('tipoFlujo', mode='before')
    @classmethod
    def tipoFlujo_no_null(cls, v: Any) -> str:
        return v if v else "LINEAL"

    @field_validator('formulario', mode='before')
    @classmethod
    def formulario_no_null(cls, v: Any) -> Optional[dict]:
        return v if isinstance(v, dict) else None

class ConexionIA(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    nodoOrigenId: str
    nodoDestinoId: str
    etiqueta: Optional[str] = None

class DiagramaIA(BaseModel):
    model_config = ConfigDict(extra='ignore')
    carriles: list[CarrilIA]
    nodos: list[NodoIA]
    conexiones: list[ConexionIA]

# ── Modelos de request/response ────────────────────────────────────────────────

class SolicitudGenerarDiagrama(BaseModel):
    prompt: str = Field(..., min_length=10, description="Instrucción en lenguaje natural")
    diagramaActual: Optional[DiagramaIA] = Field(None, description="Diagrama existente a modificar (None = crear desde cero)")

class AccionIA(BaseModel):
    model_config = ConfigDict(extra='ignore')
    tipo: str  # AGREGAR_CARRIL | AGREGAR_NODO | AGREGAR_CONEXION | ELIMINAR_CARRIL | ELIMINAR_NODO | ELIMINAR_CONEXION | EDITAR_NODO | EDITAR_CARRIL
    datos: dict

class RespuestaGenerarDiagrama(BaseModel):
    modo: str  # CREAR | EDITAR
    diagrama: Optional[DiagramaIA] = None   # solo en modo CREAR
    acciones: Optional[list[AccionIA]] = None  # solo en modo EDITAR
    descripcion: str

# ── Prompt template ────────────────────────────────────────────────────────────

SCHEMA_JSON = """\
{{
  "carriles": [
    {{"id": "<uuid8>", "nombre": "<nombre del departamento>", "orden": 0}}
  ],
  "nodos": [
    {{
      "id": "<uuid8>",
      "carrilId": "<id del carril>",
      "etiqueta": "<nombre del paso>",
      "tipo": "INICIO|FIN|ACTIVIDAD|DECISION|COMPUERTA_PARALELA|COMPUERTA_UNION",
      "tipoFlujo": "LINEAL|CONDICIONAL|ITERATIVO|PARALELO",
      "posX": <numero>,
      "posY": <numero>,
      "ancho": <numero>,
      "alto": <numero>,
      "condiciones": ["<rama1>", "<rama2>"],
      "formulario": {{
        "titulo": "<nombre descriptivo del formulario>",
        "instrucciones": "<instrucción para el asesor sobre qué hacer en este paso>",
        "requisitos": ["<documento o requisito que el cliente debe presentar>"],
        "campos": [
          {{"nombre": "<clave_sin_espacios>", "etiqueta": "<etiqueta visible>", "tipoCampo": "TEXTO|NUMERO|FECHA|BOOLEANO|SELECCION", "requerido": true}}
        ]
      }}
    }}
  ],
  "conexiones": [
    {{"id": "<uuid8>", "nodoOrigenId": "<id>", "nodoDestinoId": "<id>", "etiqueta": "<opcional>"}}
  ]
}}"""

REGLAS_BASE = """\
Reglas estrictas:
1. SIEMPRE incluye exactamente un nodo de tipo INICIO y al menos un nodo de tipo FIN.
2. Cada nodo pertenece a un carril (carrilId debe coincidir exactamente con el id de un carril).
3. Cada carril representa un departamento, área o actor responsable.
4. Las conexiones deben formar un camino continuo desde INICIO hasta FIN.
5. Usa tipo DECISION + tipoFlujo CONDICIONAL cuando el flujo se bifurca.
6. Usa COMPUERTA_PARALELA y COMPUERTA_UNION para ramas paralelas.
7. Los ids deben ser strings cortos únicos (8 caracteres alfanuméricos).
8. Los carriles se organizan como COLUMNAS VERTICALES (flujo de arriba hacia abajo dentro de cada columna). Los nodos dentro de un carril deben tener posX pequeño (40-60) y posY incremental (~110 entre nodos). El sistema ignora posX y posY del AI y los recalcula, pero deben ser coherentes.
9. nodos INICIO y FIN tienen ancho=40, alto=40. DECISION tiene ancho=80, alto=60. El resto ancho=120, alto=50.
10. condiciones solo se rellena cuando tipoFlujo es CONDICIONAL o ITERATIVO.
11. OBLIGATORIO: Todo nodo de tipo ACTIVIDAD DEBE incluir un campo "formulario" con titulo, instrucciones, requisitos y al menos 2-4 campos relevantes para ese paso del proceso. Los campos deben tener nombres en snake_case (ej: nombre_cliente, numero_documento). NUNCA dejes formulario como null en un nodo ACTIVIDAD.
12. Los nodos INICIO, FIN, DECISION, COMPUERTA_PARALELA y COMPUERTA_UNION NO llevan formulario (omitir el campo o poner null)."""

SYSTEM_PROMPT_CREAR = """\
Eres un experto en diseño de procesos de negocio tipo BPMN con diagramas swimlane.
Tu tarea es crear un diagrama swimlane desde cero en formato JSON.

CONCEPTO DE SWIMLANE:
- Un diagrama swimlane organiza el flujo de un proceso en carriles.
- Cada carril = un actor, departamento o rol responsable (ej: "Empleado", "RRHH", "Gerencia").
- Los nodos dentro de cada carril son las tareas o pasos que realiza ese actor.
- Las conexiones (flechas) unen los pasos en orden cronológico.

TIPOS DE NODO DISPONIBLES:
- INICIO: punto de entrada del proceso. Exactamente uno por diagrama. Forma circular pequeña.
- FIN: punto de término del proceso. Al menos uno. Forma circular pequeña.
- ACTIVIDAD: tarea concreta que realiza un actor. Forma rectangular. Incluye formulario.
- DECISION: bifurcación del flujo según una condición. Forma de rombo. Tiene 2+ salidas con etiquetas.
- COMPUERTA_PARALELA: inicia varias ramas en simultáneo (fork).
- COMPUERTA_UNION: espera a que todas las ramas paralelas terminen (join).

TIPOS DE FLUJO:
- LINEAL: paso directo sin bifurcaciones (el más común).
- CONDICIONAL: el flujo se bifurca (usar con DECISION).
- ITERATIVO: el flujo puede retroceder/repetirse (p.ej. corrección → revisión).
- PARALELO: varias ramas ocurren al mismo tiempo (usar con COMPUERTA_PARALELA).

EJEMPLO DE PROCESO SIMPLE (solicitud de vacaciones):
Actores: Empleado, RRHH, Gerencia
Flujo: Empleado completa solicitud → RRHH revisa → Decisión: aprobado/rechazado
       Si aprobado → Gerencia firma → Empleado notificado (FIN)
       Si rechazado → Empleado recibe rechazo (FIN)

EJEMPLO DE PROCESO CON PARALELO (onboarding):
Flujo: RRHH registra datos → COMPUERTA_PARALELA (TI crea cuentas EN PARALELO Logística prepara equipo)
       → COMPUERTA_UNION → RRHH agenda inducción → Empleado asiste → FIN

EJEMPLO DE PROCESO ITERATIVO (revisión de informe):
Flujo: Ingeniero sube informe → Supervisor revisa → Decisión: observaciones/aprobado
       Si observaciones → regresa a "Ingeniero corrige" → vuelve a "Supervisor revisa"
       Si aprobado → Gerente firma → FIN

""" + REGLAS_BASE + """

Devuelve ÚNICAMENTE el JSON válido con la siguiente estructura, sin texto adicional ni bloques markdown:
""" + SCHEMA_JSON

SCHEMA_ACCIONES = """
{
  "acciones": [
    {"tipo": "AGREGAR_CARRIL",       "datos": {"nombre": "Finanzas"}},
    {"tipo": "AGREGAR_NODO",         "datos": {"etiqueta": "Revisar contrato", "tipo": "ACTIVIDAD", "carrilNombre": "Finanzas", "tipoFlujo": "LINEAL", "condiciones": []}},
    {"tipo": "AGREGAR_CONEXION",     "datos": {"nodoOrigenEtiqueta": "Inicio", "nodoDestinoEtiqueta": "Revisar contrato", "etiqueta": ""}},
    {"tipo": "ELIMINAR_NODO",        "datos": {"etiqueta": "Verificar documentos"}},
    {"tipo": "ELIMINAR_CARRIL",      "datos": {"nombre": "Cliente"}},
    {"tipo": "ELIMINAR_CONEXION",    "datos": {"nodoOrigenEtiqueta": "X", "nodoDestinoEtiqueta": "Y"}},
    {"tipo": "EDITAR_NODO",          "datos": {"etiqueta": "Nombre actual", "nuevoNombre": "Nombre nuevo", "tipoFlujo": "CONDICIONAL"}},
    {"tipo": "EDITAR_CARRIL",        "datos": {"nombre": "Nombre actual", "nuevoNombre": "Nombre nuevo"}},
    {"tipo": "REORDENAR_DIAGRAMA",   "datos": {"orientacion": "vertical"}},
    {"tipo": "CAMBIAR_ORIENTACION",  "datos": {"orientacion": "vertical"}}
  ],
  "descripcion": "Descripción breve de los cambios realizados"
}"""

SYSTEM_PROMPT_EDITAR = """\
Eres un agente experto en diagramas swimlane BPMN. El usuario tiene un diagrama existente y quiere EDITARLO.
Tu tarea es interpretar la instrucción en lenguaje natural y devolver una lista de ACCIONES concretas a ejecutar.
NO devuelves el diagrama completo. Devuelves solo las acciones necesarias para aplicar el cambio.

Tipos de nodo válidos (campo "tipo" en AGREGAR_NODO):
  INICIO            → nodo de inicio/comienzo/start del proceso
  FIN               → nodo de fin/término/end del proceso
  ACTIVIDAD         → paso, tarea, actividad, acción, paso de proceso
  DECISION          → decisión, decisión, bifurcación, rombo, gateway exclusivo, ¿?, condición
  COMPUERTA_PARALELA → compuerta paralela, fork, inicio de ramas paralelas
  COMPUERTA_UNION   → compuerta unión, join, convergencia de ramas paralelas

Tipos de flujo válidos (campo "tipoFlujo"):
  LINEAL     → flujo recto sin bifurcaciones (valor por defecto)
  CONDICIONAL → flujo con decisiones (usar junto con DECISION)
  ITERATIVO  → flujo con ciclos/repeticiones
  PARALELO   → flujo con ramas paralelas (usar con COMPUERTA_PARALELA)

Tipos de acciones disponibles y cuándo usarlos:

• AGREGAR_CARRIL  → cuando pide añadir un área, departamento, carril, actor, rol o swimlane.
  datos: { "nombre": "<nombre del carril>" }

• AGREGAR_NODO → cuando pide añadir un paso, actividad, inicio, fin, decisión, compuerta, tarea, nodo.
  datos: { "etiqueta": "<nombre>", "tipo": "INICIO|FIN|ACTIVIDAD|DECISION|COMPUERTA_PARALELA|COMPUERTA_UNION",
           "carrilNombre": "<nombre exacto del carril donde va>", "tipoFlujo": "LINEAL|CONDICIONAL|ITERATIVO|PARALELO",
           "condiciones": [] }
  Si el usuario no especifica carril, infiere el más lógico por el contexto.

• AGREGAR_CONEXION → cuando pide conectar dos nodos o crear una flecha entre ellos.
  datos: { "nodoOrigenEtiqueta": "<etiqueta exacta>", "nodoDestinoEtiqueta": "<etiqueta exacta>", "etiqueta": "" }

• ELIMINAR_NODO → cuando pide quitar, borrar o eliminar un paso, actividad o nodo específico.
  datos: { "etiqueta": "<etiqueta exacta del nodo>" }
  Además agrega ELIMINAR_CONEXION para cada conexión de ese nodo, y AGREGAR_CONEXION para reconectar el flujo.

• ELIMINAR_CARRIL → cuando pide quitar, borrar o eliminar un carril, área o departamento.
  datos: { "nombre": "<nombre exacto del carril>" }
  Además agrega ELIMINAR_NODO por cada nodo del carril.

• ELIMINAR_CONEXION → cuando pide desconectar dos nodos o quitar una flecha.
  datos: { "nodoOrigenEtiqueta": "<etiqueta>", "nodoDestinoEtiqueta": "<etiqueta>" }

• EDITAR_NODO → cuando pide renombrar un nodo o cambiar su tipo de flujo.
  datos: { "etiqueta": "<nombre actual>", "nuevoNombre": "<nombre nuevo>", "tipoFlujo": "<tipo o igual si no cambia>" }

• EDITAR_CARRIL → cuando pide renombrar un carril.
  datos: { "nombre": "<nombre actual>", "nuevoNombre": "<nombre nuevo>" }

• REORDENAR_DIAGRAMA → USAR SOLO cuando el usuario pide ORDENAR, REORGANIZAR, DISTRIBUIR o ACOMODAR
  el diagrama SIN añadir ni eliminar nada. Mantiene TODOS los nodos y conexiones existentes,
  solo redistribuye sus posiciones visualmente.
  datos: { "orientacion": "vertical" }   ← usar orientación vertical (columnas) por defecto; horizontal solo si el diagrama ya es horizontal
  NUNCA uses ELIMINAR + AGREGAR para ordenar: eso borra datos del usuario.

• CAMBIAR_ORIENTACION → cuando el usuario pide cambiar la disposición del diagrama a
  horizontal (carriles en filas, flujo izquierda→derecha) o
  vertical (carriles en columnas, flujo arriba→abajo).
  datos: { "orientacion": "horizontal" | "vertical" }
  Siempre combinar con REORDENAR_DIAGRAMA después para redistribuir posiciones.

REGLAS IMPORTANTES:
- Devuelve ÚNICAMENTE el JSON con la lista de acciones. Sin texto adicional, sin bloques markdown.
- Ordena acciones: primero crea carriles, luego nodos, luego conexiones; primero elimina conexiones, luego nodos, luego carriles.
- Nunca dejes el diagrama sin al menos un nodo INICIO y uno FIN.
- Si ordenas/reorganizas: usa REORDENAR_DIAGRAMA con una sola acción. NO elimines ni agregues nada.
- Los nombres de carriles y nodos son sensibles a mayúsculas; úsalos exactamente como aparecen en el diagrama actual.
- CRÍTICO: Antes de generar AGREGAR_CARRIL, revisa si ya existe un carril con ese nombre en el diagrama actual. Si ya existe, NO lo crees de nuevo; usa directamente "carrilNombre" apuntando al carril existente para el AGREGAR_NODO.
- Cuando el usuario pide "crea un elemento/nodo/paso", lo más probable es que solo necesite AGREGAR_NODO (y quizás AGREGAR_CONEXION). Solo agrega AGREGAR_CARRIL si el carril mencionado definitivamente NO existe en el diagrama.

Estructura exacta del JSON a devolver:
""" + SCHEMA_ACCIONES

# ── LLM ───────────────────────────────────────────────────────────────────────

def obtener_llm() -> ChatGroq:
    if not GROQ_API_KEY_POLICY:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY_POLICY no configurada")
    return ChatGroq(
        api_key=GROQ_API_KEY_POLICY,
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

    tiene_diagrama = (
        solicitud.diagramaActual is not None
        and (
            len(solicitud.diagramaActual.carriles) > 0
            or len(solicitud.diagramaActual.nodos) > 0
        )
    )

    if tiene_diagrama:
        diagrama_json = json.dumps(
            solicitud.diagramaActual.model_dump(), ensure_ascii=False, indent=2
        )
        messages = [
            SystemMessage(content=SYSTEM_PROMPT_EDITAR),
            HumanMessage(content=f"Diagrama actual:\n{diagrama_json}\n\nInstrucción del usuario: {solicitud.prompt}"),
        ]
        modo = "EDITAR"
    else:
        messages = [
            SystemMessage(content=SYSTEM_PROMPT_CREAR),
            HumanMessage(content=f"Crea el diagrama swimlane para el siguiente proceso:\n\n{solicitud.prompt}"),
        ]
        modo = "CREAR"

    try:
        resultado = await llm.ainvoke(messages)
        contenido: str = resultado.content.strip()

        # Limpiar bloques markdown tipo ```json ... ```
        if "```" in contenido:
            lineas = contenido.splitlines()
            contenido = "\n".join(
                l for l in lineas if not l.startswith("```")
            ).strip()

        # Extraer el PRIMER objeto JSON válido y detenerse ahí
        inicio = contenido.find("{")
        if inicio == -1:
            raise json.JSONDecodeError("No se encontró JSON en la respuesta", contenido, 0)
        datos, _ = json.JSONDecoder().raw_decode(contenido, inicio)

    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"El modelo devolvió JSON inválido: {exc}",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    descripcion = datos.get("descripcion", f"Diagrama {modo.lower()} desde: \"{solicitud.prompt[:80]}\"")

    if modo == "EDITAR":
        acciones_raw = datos.get("acciones", [])
        acciones = [AccionIA(**a) for a in acciones_raw]
        return RespuestaGenerarDiagrama(
            modo="EDITAR",
            acciones=acciones,
            descripcion=descripcion,
        )
    else:
        try:
            diagrama = DiagramaIA(**datos)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Estructura de diagrama inválida: {exc}")
        return RespuestaGenerarDiagrama(
            modo="CREAR",
            diagrama=diagrama,
            descripcion=descripcion,
        )


# ══════════════════════════════════════════════════════════════════════════════
# MÓDULO DE REPORTES DINÁMICOS (CU-15)
# ══════════════════════════════════════════════════════════════════════════════

# ── Modelos ───────────────────────────────────────────────────────────────────

class SolicitudGenerarReporte(BaseModel):
    prompt: str = Field(..., min_length=5, description="Descripción del reporte deseado en lenguaje natural")

class RespuestaGenerarReporte(BaseModel):
    titulo: str
    descripcion: str
    coleccion: str
    pipeline: list[dict]
    columnas: list[str]
    promptTranscrito: Optional[str] = None  # solo cuando vino de audio

# ── System prompt para generación de consultas ────────────────────────────────

SCHEMA_BD = """\
Base de datos MongoDB — colecciones disponibles:

1. **tramites**
   - _id (string): ID único del trámite
   - politicaId (string): ID de la política asociada
   - nombrePolitica (string): nombre de la política
   - iniciadoPor (string): correo del usuario que inició
   - estado (string): "ACTIVO" | "COMPLETADO" | "CANCELADO"
   - iniciadoEn (date): fecha/hora de inicio
   - finalizadoEn (date | null): fecha/hora de fin
   - pasos (array de objetos embebidos):
       - nodoId (string)
       - etiquetaNodo (string): nombre del paso/actividad
       - carrilNombre (string): nombre del departamento/carril
       - asignadoA (string): correo del asesor asignado
       - estado (string): "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "BLOQUEADO"
       - asignadoEn (date)
       - completadoEn (date | null)
       - datosFormulario (object): datos llenados en el formulario del paso

2. **politicas**
   - _id (string)
   - nombre (string): nombre de la política
   - descripcion (string)
   - estado (string): "BORRADOR" | "PUBLICADA"
   - creadoPor (string): correo del creador
   - creadoEn (date)
   - actualizadoEn (date)

3. **usuarios**
   - _id (string)
   - nombre (string)
   - correo (string)
   - rol (string): "ADMIN" | "ASESOR"
   - activo (boolean)
"""

SYSTEM_PROMPT_REPORTE = """\
Eres un experto en MongoDB y análisis de datos. Tu tarea es interpretar una solicitud de reporte en lenguaje natural
y generar una consulta de agregación MongoDB (aggregation pipeline) que obtenga exactamente los datos solicitados.

""" + SCHEMA_BD + """

INSTRUCCIONES:
- Genera un pipeline de agregación MongoDB válido como array de etapas.
- El pipeline debe ser compatible con MongoDB 6+.
- Selecciona SOLO los campos relevantes para el reporte usando $project.
- Usa $unwind para desanidar arrays cuando sea necesario.
- Usa $group para agrupar/agregar datos cuando el reporte lo requiera.
- Usa $sort para ordenar los resultados de forma útil.
- Limita resultados a máximo 500 registros con $limit si no hay un límite implícito.
- El campo "columnas" debe listar los nombres de los campos que aparecerán en el resultado final (en el mismo orden que aparecen en el $project o $group final).
- No uses operadores de MongoDB que no existan; verifica que la sintaxis sea correcta.
- NUNCA uses $where ni operadores que permitan inyección de código.
- Para fechas en filtros relativos (ej. "último mes"), usa expresiones con $$NOW o fechas absolutas.
- Si el usuario menciona "usuarios activos", filtra por activo: true.
- Para calcular tiempo entre fechas, usa $subtract y divide entre 1000 para segundos.

Devuelve ÚNICAMENTE el siguiente JSON sin texto adicional ni bloques markdown:
{
  "titulo": "<título descriptivo del reporte>",
  "descripcion": "<descripción breve de qué muestra el reporte>",
  "coleccion": "<nombre de la colección principal: tramites | politicas | usuarios>",
  "pipeline": [ <etapas de la aggregation pipeline> ],
  "columnas": ["<campo1>", "<campo2>", ...]
}
"""

# ── Función auxiliar: generar pipeline desde texto ────────────────────────────

def _limpiar_json_llm(texto: str) -> str:
    """Limpia la respuesta del LLM para obtener JSON válido."""
    # Quitar bloques markdown (``` json ... ```)
    if "```" in texto:
        lineas = texto.splitlines()
        texto = "\n".join(l for l in lineas if not l.strip().startswith("```")).strip()
    # Eliminar trailing commas antes de } o ] (JSON inválido generado por el modelo)
    texto = re.sub(r",\s*([}\]])", r"\1", texto)
    return texto


async def _generar_pipeline_desde_prompt(prompt: str) -> RespuestaGenerarReporte:
    if not GROQ_API_KEY_CHAT:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY_CHAT no configurada")
    llm = ChatGroq(
        api_key=GROQ_API_KEY_CHAT,
        model="llama-3.3-70b-versatile",
        temperature=0,
    )
    messages = [
        SystemMessage(content=SYSTEM_PROMPT_REPORTE),
        HumanMessage(content=f"Genera el reporte para: {prompt}"),
    ]
    try:
        resultado = await llm.ainvoke(messages)
        contenido: str = resultado.content.strip()
        contenido = _limpiar_json_llm(contenido)

        inicio = contenido.find("{")
        if inicio == -1:
            raise json.JSONDecodeError("No se encontró JSON en la respuesta", contenido, 0)
        datos, _ = json.JSONDecoder().raw_decode(contenido, inicio)

    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"El modelo devolvió JSON inválido: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return RespuestaGenerarReporte(
        titulo=datos.get("titulo", "Reporte"),
        descripcion=datos.get("descripcion", ""),
        coleccion=datos.get("coleccion", "tramites"),
        pipeline=datos.get("pipeline", []),
        columnas=datos.get("columnas", []),
    )

# ── Endpoints de reportes ──────────────────────────────────────────────────────

@app.post("/api/ia/generar-reporte", response_model=RespuestaGenerarReporte)
async def generar_reporte_texto(solicitud: SolicitudGenerarReporte):
    """Genera una consulta de reporte a partir de un prompt de texto."""
    return await _generar_pipeline_desde_prompt(solicitud.prompt)


@app.post("/api/ia/generar-reporte-audio", response_model=RespuestaGenerarReporte)
async def generar_reporte_audio(audio: UploadFile = File(...)):
    """Transcribe el audio con Whisper (Groq) y genera la consulta del reporte."""
    if not GROQ_API_KEY_CHAT:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY_CHAT no configurada")

    # Leer el audio
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="El archivo de audio está vacío")

    # Transcribir con Whisper via Groq SDK
    try:
        groq_client = GroqClient(api_key=GROQ_API_KEY_CHAT)
        transcripcion = groq_client.audio.transcriptions.create(
            model="whisper-large-v3-turbo",
            file=(audio.filename or "audio.webm", audio_bytes),
            language="es",
            response_format="text",
        )
        prompt_transcrito: str = str(transcripcion).strip()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al transcribir el audio: {exc}")

    if not prompt_transcrito:
        raise HTTPException(status_code=422, detail="No se pudo transcribir el audio")

    resultado = await _generar_pipeline_desde_prompt(prompt_transcrito)
    resultado.promptTranscrito = prompt_transcrito
    return resultado


# ══════════════════════════════════════════════════════════════════════════════
# MÓDULO DE CHATBOT (CU-16)
# ══════════════════════════════════════════════════════════════════════════════

class MensajeChatBot(BaseModel):
    role: str   # 'system' | 'user' | 'assistant'
    content: str

class SolicitudChat(BaseModel):
    mensajes: list[MensajeChatBot]

class RespuestaChat(BaseModel):
    respuesta: str

@app.post("/api/ia/chat", response_model=RespuestaChat)
async def chatbot(solicitud: SolicitudChat):
    """Endpoint proxy de chatbot: recibe historial de mensajes y devuelve la respuesta del LLM."""
    if not GROQ_API_KEY_CHAT:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY_CHAT no configurada")
    try:
        groq_client = GroqClient(api_key=GROQ_API_KEY_CHAT)
        mensajes_groq = [{"role": m.role, "content": m.content} for m in solicitud.mensajes]
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=mensajes_groq,
            max_tokens=600,
            temperature=0.4,
        )
        respuesta = completion.choices[0].message.content or "Sin respuesta."
        return RespuestaChat(respuesta=respuesta)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
