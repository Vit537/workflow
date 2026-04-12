# Checklist de configuración — GCP + GitHub Actions

**Proyecto GCP:** `parcial-1-sw1` (número: `983013859583`)  
**MongoDB Atlas:** `mongodb+srv://demo_user:user1234@cluster0.4tqdmbd.mongodb.net/`  
**Rama a desplegar:** `ciclo-3`

---

## PARTE 1 — Lo que debes hacer en Google Cloud Console

### 1.1 Habilitar APIs

Ve a: `console.cloud.google.com` → selecciona el proyecto **parcial-1-sw1** → busca "APIs y servicios" → "Habilitar APIs"

Habilita estas 3 APIs (búscalas por nombre):

| API | Nombre para buscar |
|---|---|
| Cloud Run | `Cloud Run API` |
| Artifact Registry | `Artifact Registry API` |
| Cloud Build | `Cloud Build API` |

---

### 1.2 Crear repositorio en Artifact Registry

> Aquí se guardarán las imágenes Docker de los 3 servicios.

Ruta: **Artifact Registry** → **Repositories** → **+ Create Repository**

Completa el formulario así:

| Campo | Valor |
|---|---|
| Name | `workflow-repo` |
| Format | `Docker` |
| Mode | `Standard` |
| Location type | `Region` |
| Region | `us-central1` |
| Description | `Imágenes Docker Workflow Engine` |

Clic en **Create**.

---

### 1.3 Crear Service Account para GitHub Actions

> Esta cuenta es la que GitHub usará para subir imágenes y hacer deploy.

Ruta: **IAM & Admin** → **Service Accounts** → **+ Create service account**

**Paso 1 — Datos básicos:**

| Campo | Valor |
|---|---|
| Service account name | `workflow-github-actions` |
| Service account ID | `workflow-github-actions` (se autocompleta) |
| Description | `Cuenta para CI/CD desde GitHub Actions` |

Clic en **Create and continue**.

**Paso 2 — Roles a asignar** (agregar los 3):

| Rol |
|---|
| `Artifact Registry Writer` |
| `Cloud Run Admin` |
| `Service Account User` |

Clic en **Continue** → **Done**.

---

### 1.4 Generar clave JSON del Service Account

Ruta: **IAM & Admin** → **Service Accounts** → clic en `workflow-github-actions@parcial-1-sw1.iam.gserviceaccount.com` → pestaña **Keys** → **Add Key** → **Create new key** → tipo **JSON** → **Create**

Se descargará un archivo `.json`. **Guárdalo bien**, lo necesitarás en el siguiente paso.

---

### 1.5 Configurar red en MongoDB Atlas

> Cloud Run necesita conectarse a Atlas desde cualquier IP.

Ruta: [cloud.mongodb.com](https://cloud.mongodb.com) → tu proyecto → **Security** → **Network Access** → **+ Add IP Address**

| Campo | Valor |
|---|---|
| IP Address | `0.0.0.0/0` |
| Comment | `Cloud Run access` |

Clic en **Confirm**.

---

## PARTE 2 — Lo que debes hacer en GitHub

### 2.1 Ir a Settings del repositorio

Ruta: tu repo en GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Crear **exactamente estos secrets** uno por uno:

| Secret Name | Valor |
|---|---|
| `GCP_PROJECT_ID` | `parcial-1-sw1` |
| `GCP_SA_KEY` | El contenido completo del archivo `.json` descargado en el paso 1.4 (copia y pega todo el JSON) |
| `MONGO_URI` | `mongodb+srv://demo_user:user1234@cluster0.4tqdmbd.mongodb.net/workflow_db?retryWrites=true&w=majority` |
| `JWT_SECRET` | `3f6a9c2e1b8d4f7a0e5c3b9d6f2a8e1c4b7d0f3a6c9e2b5d8f1a4c7e0b3d6f9` |
| `GROQ_API_KEY` | Tu API key de Groq (la que usas en el `.env` del ai-service) |

> **Nota:** el nombre del secret debe ser exactamente igual, respetando mayúsculas.

---

### 2.2 Verificar la rama

Asegúrate de que la rama `ciclo-3` esté subida al repositorio remoto (ya lo hiciste en el ciclo anterior). El workflow de GitHub Actions que crearemos apuntará a esa rama.

---

## Resumen visual del flujo

```
GitHub (ciclo-3)
  └─► GitHub Actions workflow
        ├─► Usa GCP_SA_KEY para autenticarse con GCP
        ├─► Build Docker image (backend / ai-service / frontend)
        ├─► Push imagen a Artifact Registry (parcial-1-sw1 / workflow-repo)
        └─► Deploy en Cloud Run
              ├─► spring-service  → usa MONGO_URI + JWT_SECRET
              ├─► ai-service      → usa GROQ_API_KEY
              └─► angular-frontend → apunta a la URL del spring-service
```

---

## Resultado final esperado (URLs de Cloud Run)

Una vez desplegado, tendrás 3 URLs del tipo:

| Servicio | URL aproximada |
|---|---|
| Backend Spring Boot | `https://spring-service-XXXXXX-uc.a.run.app` |
| AI Service Python | `https://ai-service-XXXXXX-uc.a.run.app` |
| Frontend Angular | `https://angular-frontend-XXXXXX-uc.a.run.app` |

Las URLs exactas aparecen en los logs del workflow y en `console.cloud.google.com/run`.

---

> Hecho esto, avísame y creo los Dockerfiles y el workflow de GitHub Actions automático.
