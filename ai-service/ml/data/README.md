# Datos seed para MongoDB (y entrenamiento de los modelos)

Genera datos sintéticos **realistas** para las colecciones `usuarios`, `politicas` y `tramites`,
con **señal aprendible** para los modelos de TensorFlow de la Fase 4.

## Requisitos

```bash
# desde ai-service/  (idealmente dentro del venv)
pip install -r requirements-ml.txt   # o como mínimo: pip install pymongo bcrypt
```

MongoDB debe estar corriendo. Por defecto se usa `mongodb://localhost:27017/workflow_db`
(la misma DB del backend Java). Se puede cambiar con `--mongo-uri` o la variable `MONGO_URI`.

## Uso

```bash
# 1) Validar SIN tocar la base (genera estadísticas + muestra_tramites.json):
python ml/data/seed_mongo.py --dry-run --tramites 1200

# 2) Insertar en Mongo:
python ml/data/seed_mongo.py --tramites 1200

# 3) Reinsertar limpio (borra solo lo sembrado por este script):
python ml/data/seed_mongo.py --tramites 1500 --reset
```

## Qué crea

| Colección | Contenido | Notas |
|-----------|-----------|-------|
| `usuarios` | 8 asesores (`asesor1..8@workflow.com`) + 30 clientes (`cliente1..30@correo.com`) | Contraseña: `Password123`. No toca el `admin@workflow.com` que crea el backend Java. |
| `politicas` | 5 procesos reales (apertura de cuenta, préstamo, reclamo, seguro, onboarding) | Estado `PUBLICADA`. Diagrama simplificado (el seed se enfoca en el historial). |
| `tramites` | ~1200 trámites con sus pasos, timestamps, estados y datos de formulario | ~80% completados, ~12% cancelados, ~8% activos. |

Upsert por `correo`/`nombre`: correr el script dos veces no duplica usuarios ni políticas.

## La "señal" que aprenderán los modelos (importante para la defensa)

La duración de cada paso **no es aleatoria pura**: depende de variables presentes en los datos,
así que un modelo puede aprenderla:

- **Asesor**: cada asesor tiene un factor de velocidad (0.65 = rápido … 1.8 = lento).
- **Día de la semana**: lunes y martes están saturados (más demora).
- **Hora**: las horas pico (9–12 y 15–17) tardan más.
- **Tipo de paso / política**: cada paso tiene una duración base distinta.
- **Anomalías**: ~4% de los trámites tienen un paso con duración extrema (×8 a ×25).

Esto alimenta directamente la Fase 4:

| Modelo (TensorFlow) | Qué aprende de estos datos |
|---------------------|----------------------------|
| Riesgo de demora | ¿este paso superará su SLA? (a partir de asesor, día, hora, tipo) |
| Mejor ruta | qué asesor/carril completa más rápido |
| Prioridades | combinar antigüedad + riesgo de demora |
| Anomalías | reconocer los pasos con duración fuera de lo normal |

En el dry-run anterior salió ~26% de pasos demorados y ~46 pasos anómalos: señal suficiente
y balanceada para entrenar sin que el problema sea trivial.

## Archivos

- `seed_mongo.py` — generador + insertor (con `--dry-run` y `--reset`).
- `muestra_tramites.json` — muestra de 50 trámites generados (se regenera en cada corrida; útil para inspección y para entrenar offline sin Mongo).
