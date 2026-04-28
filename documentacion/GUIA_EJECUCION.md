# Guía de Ejecución — Workflow Engine

## Arquitectura del sistema

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  Angular 21     │    │  Spring Boot 3.3  │    │  FastAPI + Groq     │
│  Puerto 4200    │◄──►│  Puerto 8080      │    │  Puerto 8001        │
└─────────────────┘    └──────────┬───────┘    └─────────────────────┘
                                  │                        ▲
                                  ▼                        │
                         ┌────────────────┐   Angular llama directo
                         │  MongoDB       │   a /api/ia/generar-diagrama
                         │  Puerto 27017  │
                         │  DB: workflow_db│
                         └────────────────┘
```

---

## Paso 1 — Iniciar MongoDB

MongoDB debe estar corriendo **antes** de levantar el backend.

**Opción A — Si instalaste MongoDB como servicio de Windows:**
```powershell
# Verificar que ya está corriendo
Get-Service -Name MongoDB

# Si está detenido, iniciarlo
Start-Service -Name MongoDB
```

**Opcón B — Si tienes mongod en PATH:**
```powershell
mongod --dbpath "C:\data\db"
```

**Opción C — Docker:**
```powershell
docker run -d -p 27017:27017 --name mongo-workflow mongo:7
```

> **No necesitas crear la base de datos ni las colecciones a mano.**
> MongoDB es NoSQL: Spring Data crea automáticamente la base `workflow_db`
> y las colecciones `usuarios` y `politicas` la primera vez que se insertan documentos.

---

## Paso 2 — Levantar el Backend (Spring Boot)

```powershell
cd C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\backend
mvn spring-boot:run
```

**Qué hace al iniciar:**
1. Se conecta a `mongodb://localhost:27017/workflow_db`
2. Spring Data crea los índices declarados en los modelos (`@Indexed`)
3. `InicializadorDatos` se ejecuta automáticamente y verifica si existe el usuario admin:
   - Si **no existe** → lo crea e imprime en consola:
     ```
     >> Usuario administrador creado: admin@workflow.com / admin123
     ```
   - Si **ya existe** → no hace nada (idempotente)

**Verificar que levantó correctamente:**
```
http://localhost:8080/api/auth/login  ← debe responder (POST)
```

---

## Paso 3 — Configurar y levantar el Microservicio IA (Python)

```powershell
cd C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service
```

**3.1 — Crear el archivo `.env`** (solo la primera vez):
```powershell
Copy-Item .env.example .env
```
Editar `.env` y poner tu API Key de Groq:
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=llama3-8b-8192
ALLOWED_ORIGINS=http://localhost:4200
```
> Obtén tu key gratis en: https://console.groq.com/keys

**3.2 — Crear entorno virtual e instalar dependencias** (solo la primera vez):
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**3.3 — Iniciar el servicio:**
```powershell
# (con el venv activado)
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Verificar:**
```
http://localhost:8001/health  ← debe devolver {"status":"ok"}
```

> Si no necesitas la función IA por ahora, puedes omitir este paso.
> El editor seguirá funcionando; solo el botón "IA" fallará.

---

## Paso 4 — Levantar el Frontend (Angular)

```powershell
cd C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\frontend
npx ng serve
```

Esperar hasta ver:
```
✔ Compiled successfully.
```

Abrir en el navegador: **http://localhost:4200**

---

## Paso 5 — Iniciar sesión

No existe pantalla de registro. El sistema tiene usuarios pre-cargados y el admin
los crea desde el panel de gestión.

### Credenciales del administrador inicial

| Campo    | Valor               |
|----------|---------------------|
| Correo   | `admin@workflow.com` |
| Contraseña | `admin123`        |
| Rol      | `ADMIN`             |

### Flujo de login
1. Ir a `http://localhost:4200` → redirige automáticamente a `/login`
2. Ingresar las credenciales del admin
3. El backend devuelve un JWT que Angular almacena en `localStorage`
4. Se redirige al dashboard

---

## Paso 6 — Crear usuarios adicionales (opcional)

Desde el panel de **Gestión de Usuarios** (menú lateral → Usuarios):

| Rol    | Permisos |
|--------|----------|
| `ADMIN`  | Todo: usuarios, políticas, publicar, editor |
| `ASESOR` | Solo lectura de políticas publicadas |

---

## Resumen de puertos

| Servicio   | Puerto | URL base                        |
|------------|--------|---------------------------------|
| MongoDB    | 27017  | `mongodb://localhost:27017`     |
| Backend    | 8080   | `http://localhost:8080/api`     |
| IA Service | 8001   | `http://localhost:8001`         |
| Frontend   | 4200   | `http://localhost:4200`         |

---

## Solución de problemas frecuentes

### `MongoSocketOpenException` al iniciar el backend
MongoDB no está corriendo. Ejecutar el **Paso 1** primero.

### `Connection refused` al backend desde Angular
El backend aún no levantó o está en puerto diferente.
Verificar `application.properties`: `server.port=8080`.

### Error CORS en el navegador
Verificar que `app.cors.allowed-origins=http://localhost:4200` está en `application.properties`
y que el frontend corre exactamente en el puerto 4200 (no 4201).

### El botón "Publicar" devuelve error
El backend valida que el diagrama tenga al menos un nodo `INICIO` y uno `FIN`.
Agregar ambos nodos antes de publicar.

### `401 Unauthorized` en todas las peticiones
El JWT expiró (dura 24 horas). Cerrar sesión y volver a iniciar.

### El microservicio IA devuelve error 500
Verificar que `GROQ_API_KEY` está correctamente definida en `ai-service/.env`.
