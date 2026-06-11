"""Generador de datos sintéticos para poblar MongoDB (colecciones: usuarios, politicas, tramites).

Objetivo doble:
  1) Tener datos realistas para demostrar la app (usuarios, políticas, trámites).
  2) Generar HISTORIAL con SEÑAL APRENDIBLE para los modelos de TensorFlow (Fase 4):
        - riesgo de demora   → la duración de cada paso depende de: asesor, día, hora, tipo de paso.
        - mejor ruta         → asesores rápidos/lentos por carril.
        - prioridades        → antigüedad + riesgo.
        - anomalías          → ~4% de trámites con un paso de duración extrema (outlier).

El esquema coincide EXACTAMENTE con los modelos Java:
  - usuarios  → com.workflow.iam.model.User           (rol: ADMIN|ASESOR|CLIENTE)
  - politicas → com.workflow.policy.model.Politica     (estado: BORRADOR|PUBLICADA|ARCHIVADA)
  - tramites  → com.workflow.execution.model.Tramite   (estado: ACTIVO|COMPLETADO|CANCELADO)
       paso   → PasoTramite (estado: PENDIENTE|EN_PROGRESO|COMPLETADO|BLOQUEADO)

Uso:
  python ml/data/seed_mongo.py --dry-run                 # genera y valida SIN tocar Mongo (escribe muestra JSON)
  python ml/data/seed_mongo.py --tramites 1200           # inserta en mongodb://localhost:27017/workflow_db
  python ml/data/seed_mongo.py --tramites 1500 --reset   # borra trámites previos del seed y reinserta
  MONGO_URI=mongodb://host:27017/workflow_db python ml/data/seed_mongo.py

Dependencias: pymongo, bcrypt  (ver ai-service/requirements-ml.txt)
"""
from __future__ import annotations

import argparse
import json
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

# ── Parámetros globales reproducibles ────────────────────────────────────────
SEED = 42
PASSWORD_DEMO = "Password123"          # contraseña de todos los usuarios sembrados (excepto admin de Java)
DIAS_HISTORIAL = 180                   # los trámites se reparten en los últimos N días
PROP_CANCELADO = 0.12                  # 12% cancelados
PROP_ACTIVO = 0.08                     # 8% aún en curso
PROP_ANOMALIA = 0.04                   # 4% con un paso anómalo (outlier)
MARCA_SEED = "seed_ml"                 # marca en creadoPor/campos para identificar datos sembrados

random.seed(SEED)


# ── Catálogo de procesos (políticas) y sus pasos ─────────────────────────────
# Cada paso: (etiquetaNodo, carrilNombre, horas_base)  → tipoNodo = ACTIVIDAD
PROCESOS = {
    "Apertura de Cuenta Bancaria": {
        "descripcion": "Proceso para que un cliente abra una cuenta de ahorros o corriente.",
        "carriles": ["Cliente", "Cajero", "Verificacion", "Gerencia"],
        "pasos": [
            ("Recepcion de solicitud", "Cajero", 2.0),
            ("Verificacion de identidad", "Verificacion", 4.0),
            ("Validacion de documentos", "Verificacion", 6.0),
            ("Aprobacion de apertura", "Gerencia", 8.0),
            ("Activacion de cuenta", "Cajero", 3.0),
        ],
    },
    "Solicitud de Prestamo": {
        "descripcion": "Evaluacion y desembolso de un prestamo personal.",
        "carriles": ["Cliente", "Asesor", "Riesgo", "Gerencia"],
        "pasos": [
            ("Registro de solicitud", "Asesor", 3.0),
            ("Analisis de capacidad de pago", "Riesgo", 12.0),
            ("Evaluacion de riesgo crediticio", "Riesgo", 16.0),
            ("Aprobacion del comite", "Gerencia", 10.0),
            ("Desembolso", "Asesor", 4.0),
        ],
    },
    "Reclamo de Tarjeta": {
        "descripcion": "Atencion de reclamos por consumos no reconocidos en tarjeta.",
        "carriles": ["Cliente", "Atencion", "Operaciones"],
        "pasos": [
            ("Registro del reclamo", "Atencion", 2.0),
            ("Investigacion del caso", "Operaciones", 24.0),
            ("Resolucion y respuesta", "Atencion", 5.0),
        ],
    },
    "Alta de Seguro": {
        "descripcion": "Contratacion de una poliza de seguro.",
        "carriles": ["Cliente", "Agente", "Suscripcion"],
        "pasos": [
            ("Cotizacion", "Agente", 3.0),
            ("Evaluacion de suscripcion", "Suscripcion", 10.0),
            ("Emision de poliza", "Agente", 5.0),
        ],
    },
    "Onboarding de Empleado": {
        "descripcion": "Incorporacion de un nuevo empleado a la organizacion.",
        "carriles": ["RRHH", "TI", "Logistica"],
        "pasos": [
            ("Registro de datos", "RRHH", 3.0),
            ("Creacion de cuentas", "TI", 6.0),
            ("Entrega de equipo", "Logistica", 8.0),
            ("Induccion", "RRHH", 4.0),
        ],
    },
}

# Pesos: algunos procesos son más frecuentes que otros.
PESOS_PROCESO = [0.30, 0.20, 0.25, 0.15, 0.10]


# ── Factores que crean la SEÑAL aprendible ───────────────────────────────────
# Carga por día de semana (0=lunes ... 6=domingo): lunes/martes saturados.
CARGA_DIA = {0: 1.40, 1: 1.25, 2: 1.00, 3: 1.05, 4: 1.15, 5: 0.70, 6: 0.60}


def factor_hora(hora: int) -> float:
    """Horas pico (media mañana y media tarde) tardan más."""
    if 9 <= hora <= 12 or 15 <= hora <= 17:
        return 1.30
    if 8 <= hora <= 18:
        return 1.0
    return 0.85  # fuera de horario, poca cola


def sla_horas(horas_base: float) -> float:
    """Umbral de 'demora': si el paso tarda más que esto, se considera demorado."""
    return horas_base * 1.5


# ── Generación de usuarios ───────────────────────────────────────────────────

def _hash(password: str) -> str:
    import bcrypt
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def generar_usuarios():
    """Crea asesores (con velocidad propia) y clientes. No toca admin/asesor de Java."""
    hashed = _hash(PASSWORD_DEMO)

    asesores = []
    # 8 asesores, cada uno con un 'factor de velocidad' (menor = más rápido).
    velocidades = [0.65, 0.80, 0.95, 1.00, 1.10, 1.25, 1.50, 1.80]
    nombres_ase = ["Ana Rojas", "Luis Pena", "Marta Gil", "Jose Diaz", "Sofia Vela",
                   "Carlos Mejia", "Elena Soto", "Raul Campos"]
    for i, (nombre, vel) in enumerate(zip(nombres_ase, velocidades), start=1):
        correo = f"asesor{i}@workflow.com"
        asesores.append({
            "_id": uuid.uuid4().hex,
            "nombre": nombre,
            "correo": correo,
            "contrasena": hashed,
            "telefono": f"7{random.randint(1000000, 9999999)}",
            "rol": "ASESOR",
            "activo": True,
            "_velocidad": vel,  # campo auxiliar (se elimina antes de insertar)
        })

    clientes = []
    for i in range(1, 31):  # 30 clientes
        correo = f"cliente{i}@correo.com"
        clientes.append({
            "_id": uuid.uuid4().hex,
            "nombre": f"Cliente {i}",
            "correo": correo,
            "contrasena": hashed,
            "telefono": f"6{random.randint(1000000, 9999999)}",
            "rol": "CLIENTE",
            "activo": random.random() > 0.1,  # ~10% inactivos
        })

    return asesores, clientes


# ── Generación de políticas ──────────────────────────────────────────────────

def generar_politicas():
    politicas = {}
    ahora = datetime.now(timezone.utc)
    for nombre, info in PROCESOS.items():
        pid = uuid.uuid4().hex
        politicas[nombre] = {
            "_id": pid,
            "nombre": nombre,
            "descripcion": info["descripcion"],
            "estado": "PUBLICADA",
            "creadoPor": "admin@workflow.com",
            # Diagrama simplificado: el seed se enfoca en generar HISTORIAL (tramites).
            # Los diagramas completos se crean con la funcion de IA del proyecto.
            "carriles": [],
            "nodos": [],
            "conexiones": [],
            "responsables": [],
            "creadoEn": ahora - timedelta(days=DIAS_HISTORIAL + 5),
            "actualizadoEn": ahora - timedelta(days=DIAS_HISTORIAL),
        }
    return politicas


# ── Generación de trámites (el corazón: datos para ML) ───────────────────────

def _asesores_por_carril(asesores):
    """Reparte asesores entre carriles para que cada carril tenga 'su gente'."""
    carriles = sorted({c for info in PROCESOS.values() for c in info["carriles"]})
    mapa = {c: [] for c in carriles}
    for i, c in enumerate(carriles):
        # cada carril recibe 2-3 asesores rotando la lista
        mapa[c] = [asesores[(i + k) % len(asesores)] for k in range(3)]
    return mapa


def _muestra_formulario(etiqueta: str) -> dict:
    return {
        "observacion": f"Datos de '{etiqueta}'",
        "monto": round(random.uniform(100, 50000), 2),
        "verificado": random.choice([True, False]),
    }


def generar_tramites(n, asesores, clientes, politicas):
    mapa_carril = _asesores_por_carril(asesores)
    nombres_proc = list(PROCESOS.keys())
    ahora = datetime.now(timezone.utc)
    tramites = []

    for _ in range(n):
        nombre_proc = random.choices(nombres_proc, weights=PESOS_PROCESO, k=1)[0]
        info = PROCESOS[nombre_proc]
        politica = politicas[nombre_proc]
        cliente = random.choice(clientes)

        # Fecha de inicio: distribuida en el historial, sesgada a horario laboral.
        dias_atras = random.randint(0, DIAS_HISTORIAL)
        hora = random.choices(
            population=list(range(7, 20)),
            weights=[1, 3, 5, 6, 6, 4, 3, 5, 6, 5, 3, 2, 1],  # pico mañana y tarde
            k=1,
        )[0]
        inicio = (ahora - timedelta(days=dias_atras)).replace(
            hour=hora, minute=random.randint(0, 59), second=0, microsecond=0
        )

        # ¿Este trámite tendrá una anomalía? ¿se cancela? ¿sigue activo?
        es_anomalo = random.random() < PROP_ANOMALIA
        rdo = random.random()
        if rdo < PROP_CANCELADO:
            destino = "CANCELADO"
        elif rdo < PROP_CANCELADO + PROP_ACTIVO:
            destino = "ACTIVO"
        else:
            destino = "COMPLETADO"

        pasos_def = info["pasos"]
        # Si se cancela o sigue activo, se completa solo una parte de los pasos.
        if destino == "COMPLETADO":
            n_completos = len(pasos_def)
        else:
            n_completos = random.randint(1, max(1, len(pasos_def) - 1))

        paso_anomalo = random.randint(0, len(pasos_def) - 1) if es_anomalo else -1

        pasos = []
        cursor = inicio
        for idx, (etiqueta, carril, horas_base) in enumerate(pasos_def):
            asesor = random.choice(mapa_carril[carril])
            asignado_en = cursor

            # Duración = base * velocidad_asesor * carga_dia * factor_hora * ruido
            factor = (
                horas_base
                * asesor["_velocidad"]
                * CARGA_DIA[asignado_en.weekday()]
                * factor_hora(asignado_en.hour)
                * random.uniform(0.7, 1.4)
            )
            if idx == paso_anomalo:
                factor *= random.uniform(8, 25)  # outlier extremo

            duracion = timedelta(hours=max(0.2, factor))

            if idx < n_completos:
                completado_en = asignado_en + duracion
                estado_paso = "COMPLETADO"
            elif idx == n_completos:
                completado_en = None
                estado_paso = "EN_PROGRESO" if destino == "ACTIVO" else "BLOQUEADO"
            else:
                completado_en = None
                estado_paso = "PENDIENTE"

            pasos.append({
                "nodoId": uuid.uuid4().hex[:8],
                "etiquetaNodo": etiqueta,
                "carrilNombre": carril,
                "tipoNodo": "ACTIVIDAD",
                "asignadoA": asesor["correo"],
                "estado": estado_paso,
                "asignadoEn": asignado_en,
                "completadoEn": completado_en,
                "datosFormulario": _muestra_formulario(etiqueta),
            })

            if completado_en is not None:
                # pequeño tiempo muerto entre pasos (cola)
                cursor = completado_en + timedelta(hours=random.uniform(0.1, 6))
            else:
                break

        if destino == "COMPLETADO":
            finalizado = pasos[-1]["completadoEn"]
        else:
            finalizado = None

        tramites.append({
            "_id": uuid.uuid4().hex,
            "politicaId": politica["_id"],
            "nombrePolitica": nombre_proc,
            "iniciadoPor": cliente["correo"],
            "consultaId": None,
            "estado": destino,
            "pasos": pasos,
            "iniciadoEn": inicio,
            "finalizadoEn": finalizado,
        })

    return tramites


# ── Estadísticas (para validar la señal generada) ────────────────────────────

def estadisticas(tramites):
    total = len(tramites)
    por_estado = {}
    n_pasos = 0
    n_demorados = 0
    n_anomalos_aprox = 0
    base_por_paso = {
        (nombre, etq): hb
        for nombre, info in PROCESOS.items()
        for (etq, _c, hb) in info["pasos"]
    }
    for t in tramites:
        por_estado[t["estado"]] = por_estado.get(t["estado"], 0) + 1
        for p in t["pasos"]:
            if p["completadoEn"] is None:
                continue
            n_pasos += 1
            dur_h = (p["completadoEn"] - p["asignadoEn"]).total_seconds() / 3600
            hb = base_por_paso.get((t["nombrePolitica"], p["etiquetaNodo"]), 4.0)
            if dur_h > sla_horas(hb):
                n_demorados += 1
            if dur_h > hb * 6:
                n_anomalos_aprox += 1
    return {
        "tramites": total,
        "por_estado": por_estado,
        "pasos_completados": n_pasos,
        "pasos_demorados": n_demorados,
        "tasa_demora": round(n_demorados / n_pasos, 3) if n_pasos else 0,
        "pasos_anomalos_aprox": n_anomalos_aprox,
    }


# ── Inserción / dry-run ──────────────────────────────────────────────────────

def _limpiar_aux(usuarios):
    for u in usuarios:
        u.pop("_velocidad", None)
    return usuarios


def _serializar_para_json(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(str(type(obj)))


def main():
    parser = argparse.ArgumentParser(description="Poblar MongoDB con datos sinteticos para ML.")
    parser.add_argument("--tramites", type=int, default=1200, help="cantidad de tramites a generar")
    parser.add_argument("--dry-run", action="store_true", help="genera y valida sin insertar en Mongo")
    parser.add_argument("--reset", action="store_true", help="borra tramites/politicas/usuarios sembrados antes de insertar")
    parser.add_argument("--mongo-uri", default=os.getenv("MONGO_URI", "mongodb://localhost:27017/workflow_db"))
    parser.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "muestra_tramites.json"))
    args = parser.parse_args()

    print(">> Generando usuarios, politicas y tramites...")
    asesores, clientes = generar_usuarios()
    politicas = generar_politicas()
    tramites = generar_tramites(args.tramites, asesores, clientes, politicas)
    _limpiar_aux(asesores)

    stats = estadisticas(tramites)
    print(">> Estadisticas de la señal generada:")
    print(json.dumps(stats, indent=2, ensure_ascii=False))

    # Muestra para inspeccion / entrenamiento offline (primeros 50 tramites)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(tramites[:50], f, indent=2, ensure_ascii=False, default=_serializar_para_json)
    print(f">> Muestra (50 tramites) escrita en: {args.out}")

    if args.dry_run:
        print(">> DRY-RUN: no se inserto nada en Mongo.")
        return

    from pymongo import MongoClient
    client = MongoClient(args.mongo_uri)
    db = client.get_default_database()
    print(f">> Conectado a: {args.mongo_uri} (db: {db.name})")

    if args.reset:
        db.tramites.delete_many({})
        db.politicas.delete_many({"creadoPor": "admin@workflow.com", "nombre": {"$in": list(PROCESOS.keys())}})
        db.usuarios.delete_many({"correo": {"$regex": r"^(asesor\d+@workflow\.com|cliente\d+@correo\.com)$"}})
        print(">> Datos previos del seed eliminados (--reset).")

    # Usuarios (upsert por correo para no duplicar)
    for u in asesores + clientes:
        db.usuarios.update_one({"correo": u["correo"]}, {"$setOnInsert": u}, upsert=True)
    # Politicas (upsert por nombre)
    for p in politicas.values():
        db.politicas.update_one({"nombre": p["nombre"]}, {"$setOnInsert": p}, upsert=True)
    # Tramites
    if tramites:
        db.tramites.insert_many(tramites)

    print(f">> Insertado: {len(asesores)} asesores, {len(clientes)} clientes, "
          f"{len(politicas)} politicas, {len(tramites)} tramites.")
    print(f">> Login de prueba: asesor1@workflow.com / {PASSWORD_DEMO}  |  cliente1@correo.com / {PASSWORD_DEMO}")


if __name__ == "__main__":
    main()
