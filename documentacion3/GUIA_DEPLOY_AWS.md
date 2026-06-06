
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
