# Guía de Despliegue en AWS — Workflow Engine

> **Stack:** Spring Boot 3 (Java 17) + Angular 21 + FastAPI (Python 3.11)  
> **Base de datos:** MongoDB Atlas (externa, ya configurada)  
> **Contenedores:** Docker → Amazon ECR → Amazon ECS Fargate  
> **CI/CD:** GitHub Actions + GitHub Secrets  
> **Routing:** Application Load Balancer (ALB)

---

## Arquitectura Final en AWS

```
Internet
   │
   ▼
Application Load Balancer (ALB)  ←── HTTPS puerto 443
   │
   ├──  /api/*  ──────────────►  ECS Task: backend  (puerto 8080)
   ├──  /ws     ──────────────►  ECS Task: backend  (WebSocket)
   ├──  /ai/*   ──────────────►  ECS Task: ai-service (puerto 8000)
   └──  /*      ──────────────►  ECS Task: frontend  (puerto 8080)

Todos los servicios leen secretos desde AWS Secrets Manager.
```

---

## FASE 1 — Preparar AWS (Consola Web)

### 1.1 Crear usuario IAM para GitHub Actions

1. Ir a **IAM → Users → Create user**
2. Nombre: `github-actions-deployer`
3. En **Permissions**, elegir **Attach policies directly** y agregar:
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonECS_FullAccess`
   - `SecretsManagerReadWrite`
4. Crear usuario → ir a la pestaña **Security credentials**
5. **Create access key** → tipo: *Application running outside AWS*
6. Guardar `Access key ID` y `Secret access key` (solo se muestran una vez)

---

### 1.2 Crear los repositorios en Amazon ECR

ECR es el registro de imágenes Docker de AWS.

1. Ir a **Amazon ECR → Repositories → Create repository**
2. Crear **3 repositorios** (privados):

| Nombre del repositorio | Uso              |
|------------------------|------------------|
| `workflow/backend`     | Spring Boot API  |
| `workflow/frontend`    | Angular + Nginx  |
| `workflow/ai-service`  | FastAPI Python   |

3. Para cada repositorio, copiar el **URI** que tiene este formato:
   ```
   123456789.dkr.ecr.us-east-1.amazonaws.com/workflow/backend
   ```

---

### 1.3 Crear los secretos en AWS Secrets Manager

Ir a **Secrets Manager → Store a new secret**.

#### Secreto 1: `/workflow/backend`
- Tipo: **Other type of secret**
- Pares clave-valor:

| Clave           | Valor                                          |
|-----------------|------------------------------------------------|
| `MONGO_URI`     | `mongodb+srv://demo_user:user1234@cluster0.4tqdmbd.mongodb.net/workflow_db` |
| `JWT_SECRET`    | (string aleatorio largo, mínimo 64 caracteres) |
| `CORS_ORIGINS`  | `https://TU_DOMINIO.com` (se actualiza después) |
| `IA_SERVICE_URL`| `http://ai-service.workflow.local:8000` (se actualiza después) |

- Nombre del secreto: `/workflow/backend`

#### Secreto 2: `/workflow/ai-service`
- Tipo: **Other type of secret**
- Pares clave-valor:

| Clave                | Valor                          |
|----------------------|--------------------------------|
| `GROQ_API_KEY_POLICY`| tu clave de Groq para políticas |
| `GROQ_API_KEY_CHAT`  | tu clave de Groq para chat     |
| `GROQ_MODEL`         | `llama-3.1-8b-instant`         |
| `ALLOWED_ORIGINS`    | `https://TU_DOMINIO.com`       |

- Nombre del secreto: `/workflow/ai-service`

---

### 1.4 Crear el Cluster de ECS

1. Ir a **Amazon ECS → Clusters → Create cluster**
2. Nombre: `workflow-cluster`
3. Infrastructure: **AWS Fargate (serverless)** ✓
4. Crear cluster

---

### 1.5 Crear el rol de ejecución para las tareas ECS

Este rol le permite a ECS leer los secretos de Secrets Manager.

1. Ir a **IAM → Roles → Create role**
2. Trusted entity: **AWS service** → **Elastic Container Service Task**
3. Agregar políticas:
   - `AmazonECSTaskExecutionRolePolicy`
   - `SecretsManagerReadWrite`
4. Nombre del rol: `ecsTaskExecutionRole`

---

### 1.6 Crear el Application Load Balancer

#### a) Crear Security Groups

Primero en **EC2 → Security Groups → Create security group**:

**SG para el ALB** (`workflow-sg-alb`):
- Inbound: HTTP (80) desde `0.0.0.0/0`
- Inbound: HTTPS (443) desde `0.0.0.0/0`
- Outbound: All traffic

**SG para los servicios ECS** (`workflow-sg-ecs`):
- Inbound: All traffic desde `workflow-sg-alb` (source = el SG del ALB)
- Outbound: All traffic

#### b) Crear Target Groups

Ir a **EC2 → Target Groups → Create target group** — crear 3:

| Nombre                     | Puerto | Protocol | Health check path |
|----------------------------|--------|----------|-------------------|
| `workflow-tg-backend`      | 8080   | HTTP     | `/actuator/health` |
| `workflow-tg-frontend`     | 8080   | HTTP     | `/`                |
| `workflow-tg-ai`           | 8000   | HTTP     | `/docs`            |

- Target type: **IP addresses** (necesario para Fargate)
- VPC: la VPC por defecto

#### c) Crear el ALB

1. Ir a **EC2 → Load Balancers → Create Load Balancer → Application Load Balancer**
2. Nombre: `workflow-alb`
3. Scheme: **Internet-facing**
4. IP address type: IPv4
5. VPC: default, seleccionar **todas las subnets disponibles**
6. Security group: `sg-alb-workflow`
7. Listeners:
   - HTTP (80) → **Redirect to HTTPS** (si tienes certificado) o → `tg-workflow-frontend`
8. Crear el ALB
9. Copiar el **DNS name** del ALB (ej: `workflow-alb-123456.us-east-1.elb.amazonaws.com`)

#### d) Configurar reglas del Listener HTTP/80

En el ALB → **Listeners → HTTP:80 → Manage rules → Add rule**:

| Prioridad | Condición            | Acción                    |
|-----------|----------------------|---------------------------|
| 1         | Path `/api/*`        | Forward → `tg-workflow-backend` |
| 2         | Path `/ws`           | Forward → `tg-workflow-backend` |
| 3         | Path `/ai/*`         | Forward → `tg-workflow-ai` |
| 100       | (default)            | Forward → `tg-workflow-frontend` |

> ⚠️ Para WebSocket en el target group del backend, habilitar **stickiness** y verificar que el ALB tenga el atributo `idle_timeout.timeout_seconds` en al menos 60.

---

### 1.7 Crear Task Definitions en ECS

Ir a **ECS → Task definitions → Create new task definition**.

#### Task Definition: Backend

- **Task definition name:** `workflow-backend`
- **Launch type:** Fargate
- **Task execution role:** `ecsTaskExecutionRole`
- **CPU:** 512 (.5 vCPU) | **Memory:** 1024 MB (1 GB)

**Container:**
- Name: `backend`
- Image URI: `123456789.dkr.ecr.us-east-1.amazonaws.com/workflow/backend:latest`
- Port mappings: `8080`
- **Environment variables (desde Secrets Manager):**

| Variable       | ValueFrom (ARN del secreto)                                          |
|----------------|----------------------------------------------------------------------|
| `MONGO_URI`    | `arn:aws:secretsmanager:REGION:ACCOUNT:secret:/workflow/backend:MONGO_URI::` |
| `JWT_SECRET`   | `arn:aws:secretsmanager:REGION:ACCOUNT:secret:/workflow/backend:JWT_SECRET::` |
| `CORS_ORIGINS` | `arn:aws:secretsmanager:REGION:ACCOUNT:secret:/workflow/backend:CORS_ORIGINS::` |
| `IA_SERVICE_URL` | `arn:aws:secretsmanager:REGION:ACCOUNT:secret:/workflow/backend:IA_SERVICE_URL::` |

> Para el ARN: ir al secreto en Secrets Manager y copiar el ARN completo.

---

#### Task Definition: AI Service

- **Task definition name:** `workflow-ai-service`
- **Launch type:** Fargate
- **Task execution role:** `ecsTaskExecutionRole`
- **CPU:** 512 | **Memory:** 1024 MB

**Container:**
- Name: `ai-service`
- Image URI: `123456789.dkr.ecr.us-east-1.amazonaws.com/workflow/ai-service:latest`
- Port mappings: `8000`
- **Environment variables (desde Secrets Manager):**

| Variable              | ValueFrom                                                                |
|-----------------------|--------------------------------------------------------------------------|
| `GROQ_API_KEY_POLICY` | `arn:aws:secretsmanager:...:secret:/workflow/ai-service:GROQ_API_KEY_POLICY::` |
| `GROQ_API_KEY_CHAT`   | `arn:aws:secretsmanager:...:secret:/workflow/ai-service:GROQ_API_KEY_CHAT::` |
| `GROQ_MODEL`          | `arn:aws:secretsmanager:...:secret:/workflow/ai-service:GROQ_MODEL::` |
| `ALLOWED_ORIGINS`     | `arn:aws:secretsmanager:...:secret:/workflow/ai-service:ALLOWED_ORIGINS::` |

---

#### Task Definition: Frontend

- **Task definition name:** `workflow-frontend`
- **Launch type:** Fargate
- **Task execution role:** `ecsTaskExecutionRole`
- **CPU:** 256 | **Memory:** 512 MB

**Container:**
- Name: `frontend`
- Image URI: `123456789.dkr.ecr.us-east-1.amazonaws.com/workflow/frontend:latest`
- Port mappings: `8080`
- (No necesita variables de entorno en runtime — la URL del backend queda relativa al ALB)

---

### 1.8 Crear los Services en ECS

Para cada task definition, crear un servicio en el cluster.

Ir a **ECS → Clusters → workflow-cluster → Create service**:

#### Servicio Backend

| Campo                   | Valor                          |
|-------------------------|-------------------------------|
| Launch type             | Fargate                        |
| Task definition         | `workflow-backend:latest`      |
| Service name            | `workflow-backend-svc`         |
| Desired tasks           | 1                              |
| VPC                     | default                        |
| Subnets                 | seleccionar 2 subnets          |
| Security group          | `sg-ecs-workflow`              |
| Public IP               | **Disabled** (el ALB hace de proxy) |
| Load balancer           | `workflow-alb`                 |
| Target group            | `tg-workflow-backend`          |
| Health check grace period | 60 segundos                  |

Repetir el mismo proceso para **ai-service** y **frontend** con sus respectivos target groups.

---

## FASE 2 — Configurar GitHub Actions (CI/CD)

### 2.1 Agregar los GitHub Secrets

En tu repositorio de GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Nombre del Secret         | Valor                                                    |
|---------------------------|----------------------------------------------------------|
| `AWS_ACCESS_KEY_ID`       | Access key del usuario `github-actions-deployer`         |
| `AWS_SECRET_ACCESS_KEY`   | Secret access key del mismo usuario                      |
| `AWS_REGION`              | `us-east-1` (o la región que elegiste)                   |
| `ECR_REGISTRY`            | `123456789.dkr.ecr.us-east-1.amazonaws.com`              |

---

### 2.2 Crear el workflow de GitHub Actions

Crear el archivo `.github/workflows/deploy.yml` en la raíz del repositorio:

```yaml
name: Deploy to AWS ECS

on:
  push:
    branches: [ main ]

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REGISTRY: ${{ secrets.ECR_REGISTRY }}

jobs:
  deploy-backend:
    name: Build & Deploy Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push backend image
        run: |
          docker build -t $ECR_REGISTRY/workflow/backend:latest ./backend
          docker push $ECR_REGISTRY/workflow/backend:latest

      - name: Deploy backend to ECS
        run: |
          aws ecs update-service \
            --cluster workflow-cluster \
            --service workflow-backend-svc \
            --force-new-deployment \
            --region $AWS_REGION

  deploy-ai-service:
    name: Build & Deploy AI Service
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push ai-service image
        run: |
          docker build -t $ECR_REGISTRY/workflow/ai-service:latest ./ai-service
          docker push $ECR_REGISTRY/workflow/ai-service:latest

      - name: Deploy ai-service to ECS
        run: |
          aws ecs update-service \
            --cluster workflow-cluster \
            --service workflow-ai-service-svc \
            --force-new-deployment \
            --region $AWS_REGION

  deploy-frontend:
    name: Build & Deploy Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push frontend image
        run: |
          docker build -t $ECR_REGISTRY/workflow/frontend:latest ./frontend
          docker push $ECR_REGISTRY/workflow/frontend:latest

      - name: Deploy frontend to ECS
        run: |
          aws ecs update-service \
            --cluster workflow-cluster \
            --service workflow-frontend-svc \
            --force-new-deployment \
            --region $AWS_REGION
```

---

## FASE 3 — Primer Despliegue Manual

Si quieres desplegar la primera vez sin esperar a que GitHub Actions lo haga, desde tu computadora con Docker instalado:

```bash
# 1. Configurar credenciales AWS localmente
aws configure
# Ingresa: Access Key ID, Secret Access Key, región (us-east-1), output format (json)

# 2. Hacer login a ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# 3. Build y push del backend
cd backend
docker build -t 123456789.dkr.ecr.us-east-1.amazonaws.com/workflow/backend:latest .
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/workflow/backend:latest

# 4. Build y push del ai-service
cd ../ai-service
docker build -t 123456789.dkr.ecr.us-east-1.amazonaws.com/workflow/ai-service:latest .
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/workflow/ai-service:latest

# 5. Build y push del frontend
cd ../frontend
docker build -t 123456789.dkr.ecr.us-east-1.amazonaws.com/workflow/frontend:latest .
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/workflow/frontend:latest
```

Luego en la consola de ECS → cada servicio → **Update** → **Force new deployment** → Update.

---

## FASE 4 — Verificación y URL Final

### 4.1 Verificar que los servicios están corriendo

En **ECS → Clusters → workflow-cluster → Services**, cada servicio debe mostrar:
- Status: **ACTIVE**
- Running tasks: **1/1**

Si hay errores, ir a **Tasks → seleccionar la tarea fallida → Logs** (CloudWatch).

### 4.2 Habilitar logs en CloudWatch

En cada Task Definition, dentro del contenedor habilitar:
- **Log driver:** `awslogs`
- **awslogs-group:** `/ecs/workflow-backend` (o frontend / ai-service)
- **awslogs-region:** `us-east-1`
- **awslogs-stream-prefix:** `ecs`

### 4.3 Acceder a la aplicación

La URL de acceso es el **DNS del ALB**:
```
http://workflow-alb-123456.us-east-1.elb.amazonaws.com
```

- Frontend: `http://workflow-alb-...elb.amazonaws.com/`
- Backend API: `http://workflow-alb-...elb.amazonaws.com/api/`
- AI Service: `http://workflow-alb-...elb.amazonaws.com/ai/`

---

## FASE 5 — Actualizar Variables Post-Despliegue

Una vez que tengas el DNS del ALB, actualizar los secretos:

1. Ir a **Secrets Manager → /workflow/backend**
2. **Edit secret** → actualizar:
   - `CORS_ORIGINS` = `http://workflow-alb-123456.us-east-1.elb.amazonaws.com`
   - `IA_SERVICE_URL` = `http://workflow-alb-123456.us-east-1.elb.amazonaws.com/ai`
3. Ir a **Secrets Manager → /workflow/ai-service**
4. Actualizar `ALLOWED_ORIGINS` = `http://workflow-alb-123456.us-east-1.elb.amazonaws.com`

5. Forzar redeploy de todos los servicios ECS (Update → Force new deployment) para que tomen los nuevos secretos.

---

## Resumen de Variables de Entorno por Servicio

### Backend (`/workflow/backend` en Secrets Manager)

| Variable       | Descripción                          | Ejemplo                                               |
|----------------|--------------------------------------|-------------------------------------------------------|
| `MONGO_URI`    | URI de conexión a MongoDB Atlas      | `mongodb+srv://user:pass@cluster.mongodb.net/workflow_db` |
| `JWT_SECRET`   | Clave secreta para tokens JWT        | string de 64+ caracteres aleatorios                   |
| `CORS_ORIGINS` | Orígenes permitidos para CORS        | URL del ALB o dominio propio                          |
| `IA_SERVICE_URL` | URL interna del microservicio IA   | `http://alb-url/ai`                                   |

### AI Service (`/workflow/ai-service` en Secrets Manager)

| Variable              | Descripción                          |
|-----------------------|--------------------------------------|
| `GROQ_API_KEY_POLICY` | API Key de Groq para políticas       |
| `GROQ_API_KEY_CHAT`   | API Key de Groq para chatbot         |
| `GROQ_MODEL`          | Modelo a usar (default: llama-3.1-8b-instant) |
| `ALLOWED_ORIGINS`     | Orígenes permitidos (URL del ALB)    |

---

## Costos Estimados (mínimos, región us-east-1)

| Servicio                   | Costo aproximado/mes |
|----------------------------|----------------------|
| ECS Fargate (3 tasks x 0.5 vCPU, 1GB, 24/7) | ~$30–50 USD |
| Application Load Balancer  | ~$20 USD             |
| ECR (almacenamiento)       | ~$1–2 USD            |
| Secrets Manager (3 secretos) | ~$1.50 USD         |
| **Total estimado**         | **~$55–75 USD/mes**  |

> Para reducir costos en desarrollo: bajar las tasks a 0 cuando no se use (Scale desired count to 0 en ECS Services).

---

## Cambios Realizados en el Código

Los siguientes cambios se realizaron automáticamente para preparar el proyecto:

### Frontend (`frontend/`)
- **Creados:** `src/environments/environment.ts` y `src/environments/environment.prod.ts`
- **Actualizado:** `angular.json` — agrega `fileReplacements` para el build de producción
- **Actualizados:** todos los servicios Angular (`auth`, `usuario`, `tramite`, `reporte`, `politica`, `kpi`, `ia`, `chatbot`, `consulta`, `websocket`) — reemplazadas las URLs hardcodeadas `http://localhost:8080` por `environment.apiUrl` (vacío en prod = URLs relativas al ALB)

### AI Service (`ai-service/`)
- **Actualizado:** `Dockerfile` — cambiado de puerto variable `$PORT` a puerto fijo `8000` (compatible con ECS Fargate)
