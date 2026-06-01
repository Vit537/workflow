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

---

---

# MIGRACIÓN A SA-EAST-1 (São Paulo) — Mejor rendimiento

> **Por qué migrar:** Tu MongoDB Atlas está en GCP South America (São Paulo). Con ECS en us-east-2 (Ohio), cada query cruza el Atlántico (~200ms de latencia). Moviendo ECS a `sa-east-1` la latencia cae a ~5ms.
>
> **El workflow NO necesita cambios** — ya lee la región y el registro ECR desde los GitHub Secrets.

---

## Qué hay que hacer

| Tarea | Dónde | Tiempo |
|---|---|---|
| Cambiar región en consola AWS a `sa-east-1` | AWS Console | — |
| Crear 2 repos ECR en sa-east-1 | AWS Console | 5 min |
| Crear ECS Cluster en sa-east-1 | AWS Console | 3 min |
| Crear 2 Task Definitions | AWS Console | 10 min |
| Crear Security Groups + ALB | AWS Console | 10 min |
| Crear 2 ECS Services + Target Groups | AWS Console | 10 min |
| Actualizar 2 GitHub Secrets | GitHub | 2 min |
| Hacer push para redeploy | Terminal | 1 min |

---

## PASO M1 — Cambiar región en la consola AWS

En la consola AWS (esquina superior derecha), cambia la región a **South America (São Paulo) — sa-east-1**.

> Todos los pasos siguientes se hacen en **sa-east-1**.

---

## PASO M2 — Crear los repos ECR en sa-east-1

> **ECR → Repositories → Create repository** (2 veces)

Crea exactamente los mismos nombres:

| Repository name | Visibility |
|---|---|
| `workflow/ai-service` | Private |
| `workflow/backend` | Private |

Después de crearlos, copia el **ECR Registry URI**. Tendrá este formato:

```
123456789012.dkr.ecr.sa-east-1.amazonaws.com
```

Guárdalo — lo necesitas en el Paso M8.

---

## PASO M3 — Crear el Cluster ECS en sa-east-1

> **ECS → Clusters → Create cluster**

| Campo | Valor |
|---|---|
| Cluster name | `workflow-cluster` |
| Infrastructure | AWS Fargate ✅ |

Clic en **Create**.

---

## PASO M4 — Crear los Security Groups

> **EC2 → Security Groups → Create security group**

### Security Group 1: ALB

| Campo | Valor |
|---|---|
| Name | `workflow-sg-alb` |
| VPC | VPC default |

**Inbound rules:**

| Type | Protocol | Port | Source |
|---|---|---|---|
| Custom TCP | TCP | 80 | 0.0.0.0/0 |
| Custom TCP | TCP | 8080 | 0.0.0.0/0 |

### Security Group 2: ECS Tasks

| Campo | Valor |
|---|---|
| Name | `workflow-sg-ecs` |
| VPC | VPC default |

**Inbound rules:**

| Type | Protocol | Port | Source |
|---|---|---|---|
| All traffic | All | All | `workflow-sg-alb` (selecciona el SG del ALB) |

---

## PASO M5 — Crear el Application Load Balancer (ALB)

> **EC2 → Load Balancers → Create load balancer → Application Load Balancer**

| Campo | Valor |
|---|---|
| Name | `workflow-alb` |
| Scheme | Internet-facing |
| IP address type | IPv4 |
| VPC | VPC default |
| Subnets | Selecciona **todas** las subnets disponibles (mínimo 2) |
| Security group | `workflow-sg-alb` |

### Listener y Target Group (crear desde el ALB)

En la sección **Listeners and routing**, configura:

| Campo | Valor |
|---|---|
| Protocol | HTTP |
| Port | 8080 |
| Default action | Forward to → crear nuevo target group |

**Nuevo Target Group:**

| Campo | Valor |
|---|---|
| Target type | IP |
| Name | `workflow-backend-tg` |
| Protocol | HTTP |
| Port | 8080 |
| VPC | VPC default |
| Health check path | `/actuator/health` |
| Healthy threshold | 2 |
| Unhealthy threshold | 3 |
| Interval | 30 seconds |

Clic en **Create load balancer**.

---

## PASO M6 — Crear las Task Definitions en sa-east-1

> **ECS → Task definitions → Create new task definition**

### Task Definition: AI Service

| Campo | Valor |
|---|---|
| Family name | `workflow-ai-service-td` |
| Launch type | AWS Fargate |
| OS | Linux/X86_64 |
| CPU | 0.5 vCPU |
| Memory | 1 GB |

**Container:**

| Campo | Valor |
|---|---|
| Name | `ai-service` |
| Image URI | `<TU-ECR-SA-EAST-1>/workflow/ai-service:latest` |
| Port | 8000 |

**Variables de entorno:**

| Key | Value |
|---|---|
| `GROQ_API_KEY_POLICY` | `tu-groq-api-key` |
| `GROQ_API_KEY_CHAT` | `tu-groq-api-key` |
| `GROQ_MODEL_CHAT` | `llama-3.1-8b-instant` |
| `ALLOWED_ORIGINS` | `*` |

---

### Task Definition: Backend

| Campo | Valor |
|---|---|
| Family name | `workflow-backend-td` |
| Launch type | AWS Fargate |
| OS | Linux/X86_64 |
| CPU | 0.5 vCPU |
| Memory | **2 GB** ← aumentado para mejor rendimiento JVM |

**Container:**

| Campo | Valor |
|---|---|
| Name | `backend` |
| Image URI | `<TU-ECR-SA-EAST-1>/workflow/backend:latest` |
| Port | 8080 |

**Variables de entorno:**

| Key | Value |
|---|---|
| `MONGO_URI` | `tu-mongo-uri-de-atlas` |
| `JWT_SECRET` | `tu-jwt-secret` |
| `CORS_ORIGINS` | `*` |
| `IA_SERVICE_URL` | `http://localhost:8001` ← actualizar después con Service Connect |
| `PORT` | `8080` |

---

## PASO M7 — Crear los ECS Services en sa-east-1

> **ECS → Clusters → workflow-cluster → Services → Create**

### Service 1: AI Service

| Campo | Valor |
|---|---|
| Launch type | FARGATE |
| Task Definition | `workflow-ai-service-td` |
| Service name | `workflow-ai-svc` ← exacto |
| Desired tasks | `1` |

**Networking:**
- Subnets: mismas que el ALB (todas las públicas)
- Security group: `workflow-sg-ecs`
- Auto-assign public IP: **ENABLED** ✅

No adjuntar ALB al AI Service.

---

### Service 2: Backend

| Campo | Valor |
|---|---|
| Launch type | FARGATE |
| Task Definition | `workflow-backend-td` |
| Service name | `workflow-backend-service-8xmfry08` ← exacto |
| Desired tasks | `1` |
| Health check grace period | **120 segundos** ← importante |

**Networking:**
- Subnets: mismas que el ALB
- Security group: `workflow-sg-ecs`
- Auto-assign public IP: **DISABLED** (el ALB hace de frontera)

**Load balancing — adjuntar el ALB:**
- Load balancer type: Application Load Balancer
- Load balancer: `workflow-alb`
- Container: `backend : 8080`
- listener lo usas el que ya creaste 
- Target group: `workflow-backend-tg`

Clic en **Create**.


Mirando la imagen: el target group workflow-backend-tg ya está seleccionado correctamente y el health check /actuator/health está bien.

El problema es el puerto del listener — cámbialo de 80 a 8080.

Deja seleccionado "Create new listener" pero cambia el puerto:

Port: 8080   ← cambiar esto
Protocol: HTTP  ← dejar así

Esto crea un nuevo listener en el ALB en el puerto 8080 que redirige al workflow-backend-tg. Así la URL de prueba en Postman será:

El security group workflow-sg-alb ya tiene el puerto 8080 abierto (lo configuramos en M4), así que todo encaja.

---

## PASO M8 — Actualizar los 2 GitHub Secrets

> Repositorio GitHub → **Settings** → **Secrets and variables** → **Actions**

Edita (o recrea) estos dos secrets:

| Secret | Valor nuevo |
|---|---|
| `AWS_REGION` | `sa-east-1` |
| `ECR_REGISTRY` | `123456789012.dkr.ecr.sa-east-1.amazonaws.com` ← el que copiaste en M2 |

Los demás secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `FIREBASE_ADMINSDK_JSON`) **no cambian**.

---



El error es claro: dial tcp 18.228.246.237:443: i/o timeout

El task de ECS no puede conectarse a ECR para bajar la imagen Docker. Pasa porque pusiste Auto-assign public IP: DISABLED en el backend service — sin IP pública, el task no tiene salida a internet para hablar con ECR (y no hay NAT Gateway).

La solución: habilitar Auto-assign public IP en el backend service.

El ALB igual lo va a alcanzar por su IP privada (el target group usa type IP), así que la seguridad no cambia.

Pasos:
ECS → workflow-cluster → Services → workflow-backend-service-8xmfry08
Clic en Update service
En la sección Networking → Auto-assign public IP → cámbialo a ENABLED
Clic en Update
El servicio va a reiniciar el task, esta vez con IP pública y podrá bajar la imagen de ECR sin problema. En ~2-3 minutos debería pasar a 1/1 tasks running.

## PASO M9 — Trigger del redeploy

Con los secrets actualizados, haz un push vacío para disparar el pipeline:

```bash
git commit --allow-empty -m "chore: migrar deploy a sa-east-1"
git push origin ciclo-4
```

O ve a **GitHub → Actions → Deploy Backend & AI Service → Run workflow** y ejecútalo manualmente.

El pipeline va a:
1. Hacer login al ECR en sa-east-1
2. Buildear y pushear las imágenes al nuevo registro
3. Hacer `ecs update-service` en el cluster de sa-east-1

---

## PASO M10 — Verificar el nuevo DNS del ALB

1. **EC2 → Load Balancers → workflow-alb**
2. Copia el **DNS name** (algo como `workflow-alb-XXXXXXXXX.sa-east-1.elb.amazonaws.com`)
3. Prueba en Postman:

```
POST http://workflow-alb-XXXXXXXXX.sa-east-1.elb.amazonaws.com:8080/api/auth/login
Content-Type: application/json

{
  "correo": "tu-email@test.com",
  "contrasena": "tu-password"
}
```

Esperas: `200 OK` con JWT token — y notarás que responde mucho más rápido.

---

## PASO M11 — Apagar los recursos en us-east-2 (ahorrar costos)

Una vez que sa-east-1 esté funcionando, elimina lo de Ohio para no pagar doble:

1. **ECS → us-east-2 → workflow-cluster → Services:**
   - `workflow-backend-service-8xmfry08` → Update → Desired tasks: `0` → Update
   - `workflow-ai-svc` → Update → Desired tasks: `0` → Update
2. **EC2 → us-east-2 → Load Balancers** → selecciona `workflow-alb` → Actions → Delete
3. **ECR → us-east-2** → puedes dejar los repos (no generan costo sin imágenes) o borrarlos

> Los repos ECR en us-east-2 pueden quedar — las imágenes nuevas solo se pushean al de sa-east-1.

---

## Resultado esperado después de la migración

| Métrica | Antes (us-east-2) | Después (sa-east-1) |
|---|---|---|
| Latencia MongoDB | ~200-2000ms | ~5ms |
| Startup del backend en ECS | ~42 segundos | ~8-12 segundos |
| Respuesta API login | ~500-2000ms | ~50-100ms |
| Región al usuario (Bolivia/SA) | Ohio, EEUU | São Paulo, Brasil |
