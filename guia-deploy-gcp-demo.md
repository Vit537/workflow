# Guía de despliegue en GCP — Demo 1 semana

> Stack: Angular + Spring Boot + Python microservicio + MongoDB Atlas  
> Objetivo: mostrar el proyecto funcionando en producción, luego apagarlo sin costos residuales.

---

## Índice

1. [Prerequisitos](#1-prerequisitos)
2. [MongoDB Atlas — configuración inicial](#2-mongodb-atlas--configuración-inicial)
3. [Preparar imágenes Docker](#3-preparar-imágenes-docker)
4. [Subir imágenes a Artifact Registry](#4-subir-imágenes-a-artifact-registry)
5. [Desplegar en Cloud Run](#5-desplegar-en-cloud-run)
   - [Python microservicio](#51-python-microservicio)
   - [Spring Boot backend](#52-spring-boot-backend)
   - [Angular frontend](#53-angular-frontend)
6. [Variables de entorno y secretos](#6-variables-de-entorno-y-secretos)
7. [Verificar que todo funciona](#7-verificar-que-todo-funciona)
8. [Apagar todo al terminar](#8-apagar-todo-al-terminar)
9. [Costos estimados](#9-costos-estimados)

---

## 1. Prerequisitos

### Herramientas necesarias

```bash
# Instalar Google Cloud CLI
# https://cloud.google.com/sdk/docs/install

# Verificar instalación
gcloud --version
docker --version

# Login
gcloud auth login
gcloud auth configure-docker
```

### Crear proyecto GCP

```bash
# Crear proyecto nuevo (nombre a tu gusto)
gcloud projects create mi-proyecto-demo --name="Demo Inge"

# Establecerlo como activo
gcloud config set project mi-proyecto-demo

# Habilitar facturación (necesario para Cloud Run)
# Ve a: https://console.cloud.google.com/billing

# Habilitar APIs necesarias
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 2. MongoDB Atlas — configuración inicial

> Atlas es un servicio externo a GCP (de MongoDB Inc.), pero puedes elegir que corra en infraestructura de Google Cloud para que la conexión sea rápida y sin costo de red extra.

### Crear cuenta y cluster M0 (gratis)

1. Ve a [cloud.mongodb.com](https://cloud.mongodb.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Haz clic en **"Create a cluster"** → elige **M0 Free**
4. En el proveedor de nube selecciona **Google Cloud**
5. Elige la región más cercana, por ejemplo `us-central1` o `southamerica-east1`
6. Espera ~3 minutos a que el cluster se aprovisione

### Configurar acceso

```
En Atlas → Security → Database Access:
  - Crear usuario: demo_user
  - Contraseña: (genera una segura y guárdala)
  - Rol: readWriteAnyDatabase

En Atlas → Security → Network Access:
  - Agregar IP: 0.0.0.0/0 (permite acceso desde Cloud Run)
  - Nota: para producción real esto debe restringirse
```

### Obtener el connection string

```
Atlas → Database → Connect → Connect your application → Driver: Java / Python

Formato:
mongodb+srv://demo_user:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
```

Guarda este string, lo usarás en las variables de entorno.

---

## 3. Preparar imágenes Docker

### 3.1 Python microservicio

Crea un `Dockerfile` en la raíz del proyecto Python:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

> Si usas Flask en vez de FastAPI, reemplaza el CMD por:
> `CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]`

### 3.2 Spring Boot

Asegúrate de que `application.properties` o `application.yml` use el puerto 8080:

```properties
server.port=8080
```

Crea el `Dockerfile` en la raíz del proyecto:

```dockerfile
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 3.3 Angular frontend

Crea el `Dockerfile` en la raíz del proyecto Angular:

```dockerfile
# Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Serve con Nginx
FROM nginx:alpine
COPY --from=build /app/dist/<nombre-de-tu-app>/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

Crea el archivo `nginx.conf` al lado del Dockerfile:

```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Soporte para rutas de Angular (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Headers de seguridad básicos
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
}
```

> Este nginx.conf resuelve el problema que mencionaste: las rutas de Angular como `/dashboard` ya no dan 404 al recargar.

---

## 4. Subir imágenes a Artifact Registry

```bash
# Crear repositorio en Artifact Registry
gcloud artifacts repositories create demo-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Repositorio demo"

# Autenticar Docker con GCP
gcloud auth configure-docker us-central1-docker.pkg.dev

# --- Python microservicio ---
cd ruta/a/tu/proyecto-python

docker build -t us-central1-docker.pkg.dev/mi-proyecto-demo/demo-repo/python-service:v1 .
docker push us-central1-docker.pkg.dev/mi-proyecto-demo/demo-repo/python-service:v1

# --- Spring Boot ---
cd ruta/a/tu/proyecto-springboot

docker build -t us-central1-docker.pkg.dev/mi-proyecto-demo/demo-repo/spring-service:v1 .
docker push us-central1-docker.pkg.dev/mi-proyecto-demo/demo-repo/spring-service:v1

# --- Angular ---
cd ruta/a/tu/proyecto-angular

docker build -t us-central1-docker.pkg.dev/mi-proyecto-demo/demo-repo/angular-frontend:v1 .
docker push us-central1-docker.pkg.dev/mi-proyecto-demo/demo-repo/angular-frontend:v1
```

---

## 5. Desplegar en Cloud Run

> **Orden correcto:** primero los servicios del backend, luego el frontend (necesitas las URLs del backend para configurar el Angular).

### 5.1 Python microservicio

```bash
gcloud run deploy python-service \
  --image us-central1-docker.pkg.dev/mi-proyecto-demo/demo-repo/python-service:v1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars MONGO_URI="mongodb+srv://demo_user:TU_PASSWORD@cluster0.xxxxx.mongodb.net/demo_db?retryWrites=true&w=majority"
```

Copia la URL que te devuelve, por ejemplo:
`https://python-service-xxxxxxxx-uc.a.run.app`

### 5.2 Spring Boot backend

```bash
gcloud run deploy spring-service \
  --image us-central1-docker.pkg.dev/mi-proyecto-demo/demo-repo/spring-service:v1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars MONGO_URI="mongodb+srv://demo_user:TU_PASSWORD@cluster0.xxxxx.mongodb.net/demo_db?retryWrites=true&w=majority",PYTHON_SERVICE_URL="https://python-service-xxxxxxxx-uc.a.run.app"
```

Copia la URL: `https://spring-service-xxxxxxxx-uc.a.run.app`

### 5.3 Angular frontend

Antes de hacer el build, actualiza la URL de la API en tu `environment.prod.ts`:

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://spring-service-xxxxxxxx-uc.a.run.app'
};
```

Luego reconstruye la imagen y vuelve a subir:

```bash
cd ruta/a/tu/proyecto-angular

# Rebuild con la URL correcta
docker build -t us-central1-docker.pkg.dev/mi-proyecto-demo/demo-repo/angular-frontend:v1 .
docker push us-central1-docker.pkg.dev/mi-proyecto-demo/demo-repo/angular-frontend:v1

# Deploy
gcloud run deploy angular-frontend \
  --image us-central1-docker.pkg.dev/mi-proyecto-demo/demo-repo/angular-frontend:v1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3
```

---

## 6. Variables de entorno y secretos

Para no exponer credenciales en el comando, puedes usar **Secret Manager**:

```bash
# Crear el secreto
echo -n "mongodb+srv://demo_user:PASSWORD@..." | \
  gcloud secrets create MONGO_URI --data-file=-

# Dar acceso al servicio
gcloud secrets add-iam-policy-binding MONGO_URI \
  --member="serviceAccount:$(gcloud iam service-accounts list --format='value(email)' | head -1)" \
  --role="roles/secretmanager.secretAccessor"

# Referenciar en Cloud Run
gcloud run deploy spring-service \
  --set-secrets MONGO_URI=MONGO_URI:latest \
  ...
```

Para una demo rápida de una semana, usar `--set-env-vars` directamente es aceptable.

---

## 7. Verificar que todo funciona

```bash
# Ver los servicios desplegados
gcloud run services list --region us-central1

# Ver logs en tiempo real (útil para debug)
gcloud run services logs read spring-service --region us-central1 --limit 50
gcloud run services logs read python-service --region us-central1 --limit 50

# Probar endpoints directamente
curl https://spring-service-xxxxxxxx-uc.a.run.app/api/health
curl https://python-service-xxxxxxxx-uc.a.run.app/health
```

Las URLs finales de cada servicio las puedes ver en:
`https://console.cloud.google.com/run`

---

## 8. Apagar todo al terminar

### Opción A — Eliminar el proyecto completo (recomendada)

```bash
gcloud projects delete mi-proyecto-demo
```

Esto elimina **absolutamente todo**: Cloud Run, Artifact Registry, logs, redes, etc. Tarda ~30 días en eliminarse del todo pero los cobros se detienen de inmediato.

### Opción B — Solo eliminar los servicios de Cloud Run

```bash
gcloud run services delete angular-frontend --region us-central1 --quiet
gcloud run services delete spring-service   --region us-central1 --quiet
gcloud run services delete python-service   --region us-central1 --quiet

# Eliminar las imágenes de Artifact Registry
gcloud artifacts repositories delete demo-repo \
  --location=us-central1 --quiet
```

### MongoDB Atlas

```
Atlas → Database → Tu cluster → (...) → Pause cluster

Con M0 (free tier): no hay nada que pausar, es gratis para siempre.
Si subiste a M10: pausarlo detiene los cobros por compute.
```

> ⚠️ **Importante:** si activaste un **Load Balancer** en GCP, elimínalo también — cobra ~$18/mes fijo aunque no pase tráfico. Para esta demo no es necesario; Cloud Run ya entrega URLs HTTPS propias.

---

## 9. Costos estimados

| Servicio | Configuración | Costo 1 semana |
|---|---|---|
| Angular (Cloud Run) | 256MB, min=0 | ~$0 |
| Spring Boot (Cloud Run) | 1GB, min=0 | ~$1–3 |
| Python (Cloud Run) | 512MB, min=0 | ~$0–1 |
| MongoDB Atlas | M0 Free | $0 |
| Artifact Registry | Imágenes ~500MB | ~$0–1 |
| **Total** | | **$1 – $5 USD** |

> Los primeros $300 USD de GCP son gratuitos durante los primeros 90 días para cuentas nuevas. Es muy probable que esta demo no cueste nada si tu cuenta es nueva.

---

## Notas finales

- **Cold start de Spring Boot:** la primera request después de inactividad tarda ~3–5 segundos porque la JVM arranca desde cero. Para la demo, haz una request de "calentamiento" antes de mostrarla.
- **CORS en Spring Boot:** asegúrate de permitir el origen del frontend en tu configuración de Spring:

```java
@CrossOrigin(origins = "*") // Para demo, en prod usar la URL exacta
```

o en la configuración global:

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("*"));
    config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

- **Región recomendada:** usa `us-central1` (Iowa) — es Tier 1, la más barata, y la latencia desde Bolivia es aceptable para una demo.
