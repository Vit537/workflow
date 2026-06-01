# Guía de Despliegue Frontend en AWS — Angular + Nginx
## Stack: Docker → ECR → ECS Fargate + GitHub Actions

---

## Estado previo (ya hecho)

- Workflow `deploy-frontend.yml` ✅ ya existe y está listo
- Dockerfile frontend ✅ ya tiene nginx + Angular con inyección de URL del backend
- Recursos de backend corriendo en `sa-east-1`: ALB, ECS Cluster, Security Groups ✅

---

## Resumen del flujo

```
GitHub push (frontend/**) → GitHub Actions → Build Docker con URL del backend
    → Push a ECR workflow/frontend → ECS update-service workflow-frontend-svc
```

---

## Qué hay que crear en AWS (sa-east-1)

| Recurso | Nombre | Estado |
|---|---|---|
| ECR Repo | `workflow/frontend` | ⬜ Crear |
| ALB Target Group | `workflow-frontend-tg` | ⬜ Crear |
| ALB Listener | Puerto `80` → frontend | ⬜ Crear |
| ECS Task Definition | `workflow-frontend-td` | ⬜ Crear |
| ECS Service | `workflow-frontend-svc` | ⬜ Crear |
| GitHub Secret | `BACKEND_ALB_URL` | ⬜ Crear |

---

## PASO F1 — Crear repo ECR para el frontend

> **ECR → Repositories → Create repository**

| Campo | Valor |
|---|---|
| Visibility | Private |
| Repository name | `workflow/frontend` |
| Image tag mutability | Mutable |

Clic en **Create repository**.

---

## PASO F2 — Crear el Target Group para el frontend

> **EC2 → Target Groups → Create target group**

| Campo | Valor |
|---|---|
| Target type | IP |
| Target group name | `workflow-frontend-tg` |
| Protocol | HTTP |
| Port | 8080 |
| VPC | VPC default |
| Health check path | `/` |
| Health check protocol | HTTP |
| Healthy threshold | 2 |
| Unhealthy threshold | 3 |
| Interval | 30 seconds |

Clic en **Next** → **Create target group** (sin registrar targets, ECS lo hace solo).

---

## PASO F3 — Agregar listener puerto 80 al ALB existente

El frontend se sirve en el puerto **80** (HTTP estándar, URL limpia sin puerto).

> **EC2 → Load Balancers → workflow-alb → Listeners → Add listener**

| Campo | Valor |
|---|---|
| Protocol | HTTP |
| Port | `80` |
| Default action | Forward to `workflow-frontend-tg` |

Clic en **Add**.

> **También agrega el puerto 80 al Security Group del ALB:**
> EC2 → Security Groups → `workflow-sg-alb` → Inbound rules → Edit
> Agrega: Custom TCP / Port 80 / Source 0.0.0.0/0

---OJO AQUI PUEDE SER EL PROBLEMA PORQUE YO LO ESTOY USANDO COMO HTTP NO CUSTOM TCP

## PASO F4 — Crear la Task Definition del frontend

> **ECS → Task definitions → Create new task definition**

| Campo | Valor |
|---|---|
| Family name | `workflow-frontend-td` |
| Launch type | AWS Fargate |
| OS | Linux/X86_64 |
| CPU | 0.25 vCPU |
| Memory | 0.5 GB |

**Container:**

| Campo | Valor |
|---|---|
| Name | `frontend` |
| Image URI | `<TU-ECR-SA-EAST-1>/workflow/frontend:latest` |
| Port mappings | `8080` / TCP |

> El frontend no necesita variables de entorno — la URL del backend quedó grabada en el build de Docker.

Clic en **Create**.

---

## PASO F5 — Crear el ECS Service para el frontend

> **ECS → Clusters → workflow-cluster → Services → Create**

| Campo | Valor |
|---|---|
| Launch type | FARGATE |
| Task Definition | `workflow-frontend-td` |
| Service name | `workflow-frontend-svc` ← exacto, el workflow lo usa |
| Desired tasks | `1` |
| Health check grace period | `60` segundos |

**Networking:**
- Subnets: mismas que el ALB (todas las públicas)
- Security group: `workflow-sg-ecs` ← el mismo que el backend
- Auto-assign public IP: **ENABLED** ✅

**Load balancing — adjuntar el ALB:**
- Load balancer type: Application Load Balancer
- Load balancer: `workflow-alb`
- Listener: **Use an existing listener** → `HTTP:80`
- Target group: `workflow-frontend-tg`
- Container: `frontend : 8080`

Clic en **Create**.

---

## PASO F6 — Agregar el GitHub Secret BACKEND_ALB_URL

> **GitHub → repositorio Vit537/workflow → Settings → Secrets and variables → Actions → New repository secret**

| Nombre | Valor |
|---|---|
| `BACKEND_ALB_URL` | `http://workflow-alb-430610424.sa-east-1.elb.amazonaws.com:8080` |

> Este valor se inyecta en el `environment.prod.ts` durante el build de Docker. El Angular compilado
> apuntará directamente a ese URL para todas las llamadas a la API.

---

## PASO F7 — Actualizar CORS_ORIGINS en el backend

Cuando el frontend esté en el ALB, el origen de las peticiones será:

```
http://workflow-alb-430610424.sa-east-1.elb.amazonaws.com
```

Necesitas que el backend lo permita.

> **ECS → Task definitions → workflow-backend-td → Create new revision**

En el contenedor `backend`, actualiza la variable de entorno:

| Key | Valor actual | Valor nuevo |
|---|---|---|
| `CORS_ORIGINS` | `*` | `http://workflow-alb-430610424.sa-east-1.elb.amazonaws.com` |

> Si quieres permitir múltiples orígenes (ej. localhost para desarrollo + ALB para producción), 
> sepáralos con coma:
> ```
> http://workflow-alb-430610424.sa-east-1.elb.amazonaws.com,http://localhost:4200
> ```

Después de crear la nueva revisión:
1. **ECS → Services → workflow-backend-service-8xmfry08 → Update service**
2. Selecciona la nueva revisión de la task definition
3. Clic en **Update**

---

## PASO F8 — Trigger del deploy del frontend

Con el secret `BACKEND_ALB_URL` configurado, dispara el pipeline:

```bash
git add .
git commit -m "feat: configurar deploy frontend a AWS sa-east-1"
git push origin ciclo-4
```

El pipeline va a:
1. Buildear la imagen Angular con `BACKEND_URL` = tu ALB del backend
2. Pushear a ECR `workflow/frontend`
3. Hacer `ecs update-service workflow-frontend-svc`

---

## PASO F9 — Verificar

1. **ECS → workflow-cluster → Services → workflow-frontend-svc** → espera `1/1 tasks running`
2. Abre en el navegador:

```
http://workflow-alb-430610424.sa-east-1.elb.amazonaws.com
```

Deberías ver la app Angular cargando. Al hacer login, el frontend llamará automáticamente a:

```
http://workflow-alb-430610424.sa-east-1.elb.amazonaws.com:8080/api/auth/login
```

---

## Cómo funciona el CORS en este setup

```
Navegador (usuario)
    │
    │  GET http://alb.sa-east-1.../  → puerto 80  →  frontend (Angular/nginx)
    │  
    │  POST http://alb.sa-east-1...:8080/api/auth/login  → puerto 8080  →  backend (Spring Boot)
    │                                                                              │
    │  El navegador envía header:  Origin: http://alb.sa-east-1...               │
    │  El backend responde:  Access-Control-Allow-Origin: http://alb.sa-east-1...  ←  CORS_ORIGINS
```

**El backend verifica que el `Origin` de la petición esté en `CORS_ORIGINS`.**
Si no está → el navegador bloquea la respuesta (error CORS).
Si sí está → todo funciona.

Por eso en el Paso F7 actualizamos `CORS_ORIGINS` con la URL exacta del ALB.

---

## Arquitectura final completa

```
Usuario (navegador)
     │
     ▼
workflow-alb-430610424.sa-east-1.elb.amazonaws.com
     │
     ├── Puerto 80  → workflow-frontend-tg → ECS: workflow-frontend-svc (Angular/nginx)
     │                                            └── imagen: ECR workflow/frontend
     │
     └── Puerto 8080 → workflow-backend-tg → ECS: workflow-backend-service-8xmfry08 (Spring Boot)
                                                  ├── MongoDB Atlas (São Paulo)
                                                  ├── Firebase Admin SDK
                                                  └── AI Service (ECS: workflow-ai-svc)
```

---

## Troubleshooting

| Problema | Causa | Solución |
|---|---|---|
| Pantalla en blanco o error 404 en rutas | nginx no redirige a index.html | El nginx.conf ya tiene `try_files $uri /index.html` ✅ |
| Error CORS en el navegador | `CORS_ORIGINS` no incluye el origin del frontend | Paso F7 — actualizar variable en task definition del backend |
| Las llamadas API van a `localhost:8080` | `BACKEND_ALB_URL` secret no configurado o build sin el arg | Verificar Paso F6 y re-ejecutar pipeline |
| Frontend carga pero login falla con 401/500 | URL del backend incorrecta en el secret | Verificar que `BACKEND_ALB_URL` es exactamente `http://alb...:8080` sin slash final |
| Task en STOPPED | Error de imagen o configuración | ECS → Task → Logs → revisar el error |
