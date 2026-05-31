# Guía de Despliegue en AWS — Backend & AI Service
## Stack: Docker → ECR → ECS Fargate + GitHub Actions

---

## Resumen del flujo

```
GitHub push → GitHub Actions → Build Docker → Push a ECR → Actualiza ECS Fargate
```

Los recursos que el workflow ya espera encontrar en AWS:

| Recurso AWS | Nombre exacto |
|---|---|
| ECS Cluster | `workflow-cluster` |
| ECS Service (AI) | `workflow-ai-svc` |
| ECS Service (Backend) | `workflow-backend-service-8xmfry08` |
| ECR Repo AI | `workflow/ai-service` |
| ECR Repo Backend | `workflow/backend` |

---

## PASO 1 — Crear usuario IAM para GitHub Actions

> Consola AWS → **IAM** → Users → **Create user**

1. **Nombre de usuario:** `github-actions-deployer`
2. **Permissions:** Attach policies directly → busca y marca:
   - `AmazonEC2ContainerRegistryPowerUser`
   - `AmazonECS_FullAccess`
3. Clic en **Create user**

### Generar credenciales de acceso

1. Abre el usuario recién creado → pestaña **Security credentials**
2. Clic en **Create access key**
3. Selecciona **Application running outside AWS** → Next
4. Clic en **Create access key**
5. **⚠️ ANOTA AHORA** — solo se muestra una vez:
   - `Access key ID` → este es `AWS_ACCESS_KEY_ID`
   - `Secret access key` → este es `AWS_SECRET_ACCESS_KEY`

---

## PASO 2 — Crear los repositorios ECR

> Consola AWS → **ECR** → **Create repository** (hazlo 2 veces)

### Repositorio 1: AI Service

| Campo | Valor |
|---|---|
| Visibility | Private |
| Repository name | `workflow/ai-service` |
| Image tag mutability | Mutable |
| Encryption | AES-256 (default) |

Clic en **Create repository**.

### Repositorio 2: Backend

| Campo | Valor |
|---|---|
| Visibility | Private |
| Repository name | `workflow/backend` |
| Image tag mutability | Mutable |
| Encryption | AES-256 (default) |

Clic en **Create repository**.

### Obtener el ECR Registry URI

Después de crear los repos, en la lista de repositorios verás una columna **URI** con formato:

```
123456789012.dkr.ecr.us-east-1.amazonaws.com/workflow/ai-service
```

La parte antes del primer `/` es tu `ECR_REGISTRY`:

```
123456789012.dkr.ecr.us-east-1.amazonaws.com
```

**Anótala** — la necesitas como secreto `ECR_REGISTRY`.

---

## PASO 3 — Configurar MongoDB

El backend usa MongoDB (`MONGO_URI`). Tienes dos opciones:

### Opción A — MongoDB Atlas (recomendado, gratis tier)

1. Ve a [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. Crea un cluster gratuito (M0)
3. En **Database Access** crea un usuario con contraseña
4. En **Network Access** agrega `0.0.0.0/0` (permite conexión desde ECS)
5. En **Connect** → **Connect your application** copia el URI:
   ```
   mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/workflow_db?retryWrites=true&w=majority
   ```
6. Eso es tu `MONGO_URI`

### Opción B — DocumentDB en AWS (de pago)

Solo úsala si necesitas todo dentro de AWS. Atlas es más sencillo para empezar.

---

## PASO 4 — Crear el Cluster ECS

> Consola AWS → **ECS** → Clusters → **Create cluster**

| Campo | Valor |
|---|---|
| Cluster name | `workflow-cluster` |
| Infrastructure | AWS Fargate (serverless) ✅ |

Clic en **Create**.

---

## PASO 5 — Crear Task Definitions

Necesitas una Task Definition por servicio. Ve a **ECS → Task definitions → Create new task definition**.

---

### Task Definition: AI Service

| Campo | Valor |
|---|---|
| Task definition family | `workflow-ai-service-td` |
| Launch type | AWS Fargate |
| Operating system | Linux/X86_64 |
| CPU | 0.5 vCPU |
| Memory | 1 GB |
| Task role | Ninguno (o crea uno básico) |

**Container — add container:**

| Campo | Valor |
|---|---|
| Name | `ai-service` |
| Image URI | `<ECR_REGISTRY>/workflow/ai-service:latest` |
| Port mappings | `8000` / TCP |

**Environment variables del contenedor AI Service:**

| Key | Value | Nota |
|---|---|---|
| `GROQ_API_KEY_POLICY` | `tu-api-key-groq` | **⚠️ Pídela al equipo** |
| `GROQ_API_KEY_CHAT` | `tu-api-key-groq` | **⚠️ Pídela al equipo** |
| `GROQ_MODEL_CHAT` | `llama-3.1-8b-instant` | Modelo por defecto |
| `ALLOWED_ORIGINS` | `http://localhost:4200` | Cambia luego por el dominio del frontend |

Clic en **Create**.

---

### Task Definition: Backend

| Campo | Valor |
|---|---|
| Task definition family | `workflow-backend-td` |
| Launch type | AWS Fargate |
| Operating system | Linux/X86_64 |
| CPU | 0.5 vCPU |
| Memory | 1 GB |

**Container — add container:**

| Campo | Valor |
|---|---|
| Name | `backend` |
| Image URI | `<ECR_REGISTRY>/workflow/backend:latest` |
| Port mappings | `8080` / TCP |

**Environment variables del contenedor Backend:**

| Key | Value | Nota |
|---|---|---|
| `MONGO_URI` | `mongodb+srv://...` | **⚠️ Tu URI de MongoDB Atlas** |
| `JWT_SECRET` | `cadena-aleatoria-larga` | **⚠️ Genera una clave segura** |
| `CORS_ORIGINS` | `http://localhost:4200` | Cambia luego por el frontend |
| `IA_SERVICE_URL` | `http://localhost:8001` | **⚠️ Ver nota abajo** |
| `PORT` | `8080` | Opcional, ya tiene default |

> **Nota sobre `IA_SERVICE_URL`:** En ECS Fargate sin Service Connect, los servicios no se comunican por nombre. Después de crear el servicio AI (Paso 6), obtendrás su IP pública o podrás habilitar **Service Connect** para usar `http://ai-service:8000`. Lo más simple al inicio: desplegar el AI Service primero, anotar su IP pública y usarla aquí.

Clic en **Create**.

---

## PASO 6 — Crear los Services ECS

> **ECS → Clusters → workflow-cluster → Services → Create**

---

### Service 1: AI Service

| Campo | Valor |
|---|---|
| Launch type | FARGATE |
| Task Definition | `workflow-ai-service-td` (última revisión) |
| Service name | `workflow-ai-svc` ← **exacto, el workflow lo usa** |
| Desired tasks | `1` |

**Networking:**
- VPC: selecciona la VPC default
- Subnets: selecciona al menos 1 subred pública
- Security group: crea uno nuevo llamado `workflow-ai-sg`
  - Inbound rule: Custom TCP, Port `8000`, Source `0.0.0.0/0`
- **Auto-assign public IP: ENABLED** ✅

Clic en **Create**.

---

### Service 2: Backend

| Campo | Valor |
|---|---|
| Launch type | FARGATE |
| Task Definition | `workflow-backend-td` (última revisión) |
| Service name | `workflow-backend-service-8xmfry08` ← **exacto** |
| Desired tasks | `1` |

**Networking:**
- VPC: la misma VPC default
- Subnets: mismas subredes públicas
- Security group: crea uno nuevo llamado `workflow-backend-sg`
  - Inbound rule: Custom TCP, Port `8080`, Source `0.0.0.0/0`
- **Auto-assign public IP: ENABLED** ✅

Clic en **Create**.

---

## PASO 7 — Actualizar `IA_SERVICE_URL` en el Backend

1. ECS → Clusters → `workflow-cluster` → Services → `workflow-ai-svc`
2. Pestaña **Tasks** → abre la tarea en ejecución
3. Copia la **Public IP** (ej: `54.210.33.100`)
4. Ve a **ECS → Task Definitions → workflow-backend-td** → **Create new revision**
5. En el contenedor `backend` edita la variable:
   ```
   IA_SERVICE_URL = http://54.210.33.100:8000
   ```
6. **Create** la nueva revisión
7. Ve al service `workflow-backend-service-8xmfry08` → **Update service** → selecciona la nueva revisión → **Update**

> **Alternativa permanente:** Habilita **ECS Service Connect** en ambos servicios para comunicación por nombre DNS interno (`http://ai-service:8000`). Es la opción profesional pero requiere un paso extra de configuración.

---

## PASO 8 — Configurar GitHub Secrets

> Repositorio GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Agrega los siguientes secretos uno por uno:

| Nombre del Secret | Valor | De dónde lo sacas |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | Paso 1 — IAM |
| `AWS_SECRET_ACCESS_KEY` | `wJalrX...` | Paso 1 — IAM |
| `AWS_REGION` | `us-east-1` | La región que usaste en AWS |
| `ECR_REGISTRY` | `123456789.dkr.ecr.us-east-1.amazonaws.com` | Paso 2 — ECR |
| `FIREBASE_ADMINSDK_JSON` | *(contenido completo del .json)* | Paso 9 |

---

## PASO 9 — Firebase Admin SDK como Secret

El workflow escribe el JSON de Firebase en `backend/src/main/resources/firebase-adminsdk.json` durante el build.

1. Abre el archivo `notification-system-603aa-firebase-adminsdk-fbsvc-6587655f2c.json` de tu proyecto
2. Copia **todo el contenido** (el JSON completo)
3. En GitHub Secrets crea `FIREBASE_ADMINSDK_JSON` y pega el contenido

---

## PASO 10 — Primer Deploy

Con todos los secretos configurados, haz push a la rama `ciclo-4`:

```bash
git add .
git commit -m "test: primer deploy a AWS"
git push origin ciclo-4
```

O ve a **GitHub → Actions → Deploy Backend & AI Service → Run workflow** para dispararlo manualmente.

### Verificar el pipeline

1. GitHub → **Actions** → observa el job `Build & Deploy AI Service` primero
2. Luego el job `Build & Deploy Backend` (depende del anterior)
3. Si alguno falla, abre los logs del step que falló

---

## PASO 11 — Obtener las IPs públicas para las pruebas

Después de un deploy exitoso:

**IP del AI Service:**
1. ECS → Clusters → `workflow-cluster` → Services → `workflow-ai-svc`
2. Tasks → selecciona la tarea → copia **Public IP**
3. URL base AI: `http://<IP>:8000`

**IP del Backend:**
1. ECS → Clusters → `workflow-cluster` → Services → `workflow-backend-service-8xmfry08`
2. Tasks → selecciona la tarea → copia **Public IP**
3. URL base Backend: `http://<IP>:8080`

---

## PASO 12 — Pruebas con Postman

### Configurar el entorno en Postman

1. Postman → **Environments** → **+** → nombre: `AWS Dev`
2. Agrega estas variables:

| Variable | Valor inicial |
|---|---|
| `BACKEND_URL` | `http://<IP-BACKEND>:8080` |
| `AI_URL` | `http://<IP-AI>:8000` |
| `TOKEN` | *(se llena automático después del login)* |

---

### Prueba 1 — Health check AI Service

```
GET {{AI_URL}}/docs
```
Esperas: página HTML de Swagger (código 200)

O si tienes un endpoint de health:
```
GET {{AI_URL}}/
```

---

### Prueba 2 — Registro de usuario (Backend)

```
POST {{BACKEND_URL}}/api/auth/register
Content-Type: application/json

{
  "nombre": "Test User",
  "email": "test@test.com",
  "password": "password123",
  "rol": "ADMIN"
}
```
Esperas: `201 Created` con datos del usuario.

---

### Prueba 3 — Login (Backend)

```
POST {{BACKEND_URL}}/api/auth/login
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "password123"
}
```
Esperas: `200 OK` con un campo `token`.

**Guarda el token:** En la pestaña **Tests** de Postman agrega:
```javascript
const res = pm.response.json();
pm.environment.set("TOKEN", res.token);
```

---

### Prueba 4 — Endpoint protegido (Backend)

```
GET {{BACKEND_URL}}/api/usuarios/perfil
Authorization: Bearer {{TOKEN}}
```
Esperas: `200 OK` con datos del usuario logueado.

---

### Prueba 5 — Verificar comunicación Backend ↔ AI Service

Cualquier endpoint del backend que llame internamente al AI Service (por ejemplo creación de políticas con IA). Si responde correctamente, significa que `IA_SERVICE_URL` está bien configurado.

---

## Variables que necesitas recolectar

Antes de empezar, asegúrate de tener estos valores:

| Variable | Estado | Dónde conseguirla |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | ⬜ Pendiente | Paso 1 — IAM |
| `AWS_SECRET_ACCESS_KEY` | ⬜ Pendiente | Paso 1 — IAM |
| `AWS_REGION` | ⬜ Pendiente | La región que elijas (ej: `us-east-1`) |
| `ECR_REGISTRY` | ⬜ Pendiente | Paso 2 — ECR |
| `MONGO_URI` | ⬜ Pendiente | MongoDB Atlas |
| `JWT_SECRET` | ⬜ Pendiente | Genera con: `openssl rand -hex 32` |
| `GROQ_API_KEY_POLICY` | ⬜ Pendiente | Consola de Groq (groq.com) |
| `GROQ_API_KEY_CHAT` | ⬜ Pendiente | Consola de Groq (groq.com) |
| `FIREBASE_ADMINSDK_JSON` | ⬜ Pendiente | Archivo `.json` del proyecto |

---

## Troubleshooting común

| Problema | Causa probable | Solución |
|---|---|---|
| `ECR: denied` en el pipeline | Permisos IAM mal configurados | Verifica que el usuario tiene `AmazonEC2ContainerRegistryPowerUser` |
| `service not found` en ECS | Nombre del servicio no coincide | Verifica que los nombres son exactamente los del Paso 6 |
| Backend arranca pero no conecta a MongoDB | `MONGO_URI` mal formado o IP no whitelisteada | En Atlas, Network Access → agrega `0.0.0.0/0` |
| Backend no alcanza AI Service | `IA_SERVICE_URL` apunta a IP vieja | Las IPs de Fargate cambian con cada redeploy — ver sección de Service Connect |
| `401 Unauthorized` en Postman | Token expirado o no enviado | Haz login de nuevo y actualiza `{{TOKEN}}` |
| Task en ECS queda en STOPPED | Error en el contenedor | ECS → Task → Logs → revisar el error exacto |

---

## Arquitectura resultante

```
GitHub Actions
     │
     ├── Build Docker image (ai-service) ──► ECR: workflow/ai-service
     │         └──► ECS Service: workflow-ai-svc (Fargate, puerto 8000)
     │
     └── Build Docker image (backend) ─────► ECR: workflow/backend
               └──► ECS Service: workflow-backend-service-8xmfry08 (Fargate, puerto 8080)
                         │
                         ├── MongoDB Atlas (MONGO_URI)
                         ├── Firebase Admin SDK
                         └── AI Service (IA_SERVICE_URL)
```
