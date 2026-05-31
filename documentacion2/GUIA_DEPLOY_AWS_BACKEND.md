# Guía de Despliegue en AWS — Backend (Spring Boot)

> **Objetivo:** Dejar el backend corriendo en ECS Fargate y probarlo con Postman.  
> **Lo que ya funciona:** GitHub Actions hace `push` de la imagen a ECR en cada commit.  
> **Lo que falta:** Configurar secretos → Task Definition → ECS Service → verificar health.

---

## Estado actual

```
git push  →  GitHub Actions  →  imagen en ECR  ✓
                                      │
                                      ▼
                          ECS: Task Definition + Service  ← hacemos esto ahora
```

**Datos del entorno:**
- Región: `us-east-2`
- Cluster ECS: `workflow-cluster`
- ALB DNS: `workflow-alb-869904379.us-east-2.elb.amazonaws.com`
- Cuenta AWS: `321572485081`
- ECR backend: `321572485081.dkr.ecr.us-east-2.amazonaws.com/workflow/backend`

---

## PASO 1 — Agregar Actuator al pom.xml (health check)

El ALB necesita un endpoint `/actuator/health` para verificar que el contenedor está vivo.  
Sin Actuator el ALB marca el backend como **unhealthy** → 503.

Abrir `backend/pom.xml` y agregar dentro de `<dependencies>`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Después hacer commit y push — GitHub Actions construirá la nueva imagen automáticamente.

---

## PASO 2 — Configurar el secreto en Secrets Manager

1. Ir a **AWS Console → Secrets Manager → Store a new secret**
2. Tipo: **Other type of secret**
3. Ingresar estos pares clave-valor:

| Clave            | Valor                                                                  |
|------------------|------------------------------------------------------------------------|
| `MONGO_URI`      | `mongodb+srv://demo_user:user1234@cluster0.4tqdmbd.mongodb.net/workflow_db` |
| `JWT_SECRET`     | (mínimo 64 caracteres aleatorios, ej: `miSuperSecretoJWT2024...xxx`)   |
| `CORS_ORIGINS`   | `http://workflow-alb-869904379.us-east-2.elb.amazonaws.com`            |
| `IA_SERVICE_URL` | `http://workflow-alb-869904379.us-east-2.elb.amazonaws.com/ai`         |

4. Hacer clic en **Next**
5. Nombre del secreto: `/workflow/backend`
6. Hacer clic en **Next** → **Next** → **Store**

### Copiar el ARN del secreto

Después de crear el secreto:
1. Ir al secreto `/workflow/backend`
2. Copiar el **ARN** — tiene este formato:
   ```
   arn:aws:secretsmanager:us-east-2:321572485081:secret:/workflow/backend-XXXXXX
   ```

---

## PASO 3 — Verificar el rol de ejecución de ECS

El rol `ecsTaskExecutionRole` necesita permiso para leer Secrets Manager.

1. Ir a **IAM → Roles → ecsTaskExecutionRole**
2. Verificar que tiene estas políticas:
   - `AmazonECSTaskExecutionRolePolicy` ✓
   - `SecretsManagerReadWrite` (o `SecretsManagerReadWrite`)
3. Si falta la segunda, hacer clic en **Add permissions → Attach policies** → buscar `SecretsManagerReadWrite` → Add

---

## PASO 4 — Corregir el health check del Target Group

El target group `workflow-tg-backend` probablemente tiene el path `/actuator/health`.  
Si agregaste Actuator en el Paso 1, esto funcionará. Si prefieres no agregar Actuator:

1. Ir a **EC2 → Target Groups → workflow-tg-backend**
2. Pestaña **Health checks → Edit**
3. Cambiar:
   - **Health check path:** `/api/auth/login`
   - **Success codes:** `200-405`  
     *(405 = Method Not Allowed porque el ALB hace GET pero el endpoint espera POST — aun así indica que el servidor está vivo)*
4. Guardar cambios

---

## PASO 5 — Crear la Task Definition del backend

1. Ir a **Amazon ECS → Task definitions → Create new task definition**

### Configuración general

| Campo                        | Valor                       |
|------------------------------|-----------------------------|
| Task definition family name  | `workflow-backend`          |
| Launch type                  | AWS Fargate                 |
| Operating system             | Linux/X86_64                |
| Task execution role          | `ecsTaskExecutionRole`      |
| CPU                          | 0.5 vCPU                    |
| Memory                       | 1 GB                        |

### Configuración del contenedor

Hacer clic en **Add container**:

| Campo       | Valor                                                               |
|-------------|---------------------------------------------------------------------|
| Name        | `backend`                                                           |
| Image URI   | `321572485081.dkr.ecr.us-east-2.amazonaws.com/workflow/backend:latest` |
| Port        | `8080` — Protocol: `TCP`                                            |

### Variables de entorno (desde Secrets Manager)

En la sección **Environment variables**, cambiar el tipo a **ValueFrom** e ingresar:

| Key              | Value type   | Value                                                                                          |
|------------------|--------------|------------------------------------------------------------------------------------------------|
| `MONGO_URI`      | ValueFrom    | `arn:aws:secretsmanager:us-east-2:321572485081:secret:/workflow/backend-XXXXXX:MONGO_URI::`    |
| `JWT_SECRET`     | ValueFrom    | `arn:aws:secretsmanager:us-east-2:321572485081:secret:/workflow/backend-XXXXXX:JWT_SECRET::`   |
| `CORS_ORIGINS`   | ValueFrom    | `arn:aws:secretsmanager:us-east-2:321572485081:secret:/workflow/backend-XXXXXX:CORS_ORIGINS::` |
| `IA_SERVICE_URL` | ValueFrom    | `arn:aws:secretsmanager:us-east-2:321572485081:secret:/workflow/backend-XXXXXX:IA_SERVICE_URL::` |

> **Importante:** reemplazar `XXXXXX` con el sufijo aleatorio del ARN real de tu secreto.  
> El formato es: `ARN_COMPLETO:NOMBRE_CLAVE::`  (dos puntos al final, campo de versión vacío)

### Log configuration (opcional pero recomendado)

| Campo                  | Valor                    |
|------------------------|--------------------------|
| Log driver             | `awslogs`                |
| awslogs-group          | `/ecs/workflow-backend`  |
| awslogs-region         | `us-east-2`              |
| awslogs-stream-prefix  | `ecs`                    |

2. Hacer clic en **Create**

---

## PASO 6 — Crear el Service en ECS

1. Ir a **ECS → Clusters → workflow-cluster**
2. Pestaña **Services → Create**

### Environment

| Campo                         | Valor         |
|-------------------------------|---------------|
| Compute options               | Launch type   |
| Launch type                   | FARGATE       |
| Platform version              | LATEST        |

### Deployment configuration

| Campo                         | Valor                       |
|-------------------------------|-----------------------------|
| Application type              | Service                     |
| Task definition family        | `workflow-backend`          |
| Task definition Revision      | LATEST                      |
| Service name                  | `workflow-backend-svc`      |
| Desired tasks                 | `1`                         |

### Deployment options

| Campo                         | Valor                       |
|-------------------------------|-----------------------------|
| Deployment type               | Rolling update              |
| Min running tasks             | 100%                        |
| Max running tasks             | 200%                        |

### Networking

| Campo                         | Valor                                      |
|-------------------------------|--------------------------------------------|
| VPC                           | (la VPC por defecto)                       |
| Subnets                       | Seleccionar **todas las subnets** disponibles |
| Security groups               | `workflow-sg-ecs` (el SG de los servicios ECS) |
| Public IP                     | **TURNED OFF** (el ALB es el punto de entrada) |

### Load balancing

| Campo                         | Valor                           |
|-------------------------------|---------------------------------|
| Load balancer type            | Application Load Balancer       |
| Load balancer                 | `workflow-alb`                  |
| Listener                      | `80:HTTP`                       |
| Target group                  | `workflow-tg-backend`           |

### Service discovery (opcional)

Dejar deshabilitado para simplificar.

3. Hacer clic en **Create**

---

## PASO 7 — Verificar que el servicio está corriendo

### 7.1 Verificar el Service

1. Ir a **ECS → Clusters → workflow-cluster → Services → workflow-backend-svc**
2. Esperar ~2-3 minutos
3. Verificar:
   - **Status:** ACTIVE ✓
   - **Running:** 1/1 ✓

### 7.2 Verificar el Target Group

1. Ir a **EC2 → Target Groups → workflow-tg-backend**
2. Pestaña **Targets**
3. El target debe aparecer como **healthy** ✓

Si aparece **unhealthy**:
- Revisar que el contenedor inició (ECS → Task → Logs en CloudWatch)
- Revisar el path del health check (Paso 4)
- Revisar que `MONGO_URI` es correcto y MongoDB Atlas acepta conexiones desde `0.0.0.0/0`

### 7.3 Revisar logs si algo falla

1. Ir a **CloudWatch → Log groups → /ecs/workflow-backend**
2. Abrir el log stream más reciente
3. Buscar errores de arranque

---

## PASO 8 — Probar el backend con Postman

### 8.1 Endpoint de Login

**URL:**
```
POST http://workflow-alb-869904379.us-east-2.elb.amazonaws.com/api/auth/login
```

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "correo": "admin@workflow.com",
  "contrasena": "admin123"
}
```

**Respuesta esperada (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tipo": "Bearer",
  "correo": "admin@workflow.com",
  "nombre": "Administrador",
  "rol": "ADMIN"
}
```

### 8.2 Cómo configurar en Postman

1. Abrir Postman → **New Request**
2. Seleccionar método: `POST`
3. Pegar la URL del ALB
4. Ir a **Body → raw → JSON**
5. Pegar el body de ejemplo
6. Hacer clic en **Send**

Si recibes `401 Unauthorized` con mensaje de credenciales inválidas — el backend está funcionando (la respuesta viene del backend, no del ALB).

Si recibes `503 Service Unavailable` — el ALB no llega al backend, revisar los Pasos 4 y 7.

### 8.3 Verificar que el JWT funciona

Con el token recibido, probar otro endpoint:

**URL:**
```
GET http://workflow-alb-869904379.us-east-2.elb.amazonaws.com/api/tramites
```

**Headers:**
```
Authorization: Bearer <TOKEN_AQUI>
Content-Type: application/json
```

**Respuesta esperada:** lista de trámites en JSON (puede estar vacía `[]` si no hay datos).

---

## Resumen — Variables de entorno del backend

| Variable         | Dónde se configura   | Descripción                                     |
|------------------|---------------------|-------------------------------------------------|
| `MONGO_URI`      | Secrets Manager      | URI completo de MongoDB Atlas                   |
| `JWT_SECRET`     | Secrets Manager      | Clave para firmar los tokens JWT (64+ chars)    |
| `CORS_ORIGINS`   | Secrets Manager      | URL del ALB (permite CORS desde el frontend)    |
| `IA_SERVICE_URL` | Secrets Manager      | URL del ai-service para llamadas internas        |
| `PORT`           | (no necesario)       | El backend usa 8080 por defecto vía `${PORT:8080}` |

---

## Flujo completo de actualización

Cuando hagas cambios al código del backend:

```
1. git add .
2. git commit -m "descripción del cambio"
3. git push origin ciclo-4
      ↓
4. GitHub Actions detecta el push
      ↓
5. Build de imagen Docker
      ↓
6. Push a ECR (reemplaza el :latest)
      ↓
7. aws ecs update-service --force-new-deployment
      ↓
8. ECS detiene el task viejo, inicia el nuevo con la imagen fresca
      ↓
9. ALB redirige el tráfico al nuevo task cuando pasa el health check
```

Tiempo total: ~3-5 minutos desde el push hasta que el nuevo código está en producción.
