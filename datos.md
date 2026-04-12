DATOS DEL PROYECTO DE GOOGLE CLOUD 

Project number: 983013859583 Project ID: parcial-1-sw1 


DATOS DEL PROYECTO DE MONGO DB

mongodb+srv://demo_user:user1234@cluster0.4tqdmbd.mongodb.net/


contexto: 

hola necesito que lo alistes para subirlo a produccion a google cloud debes revisar este doc contiene informacion sobre como lo vamos hacer "guia-deploy-gcp-demo"

bien haber te comento como lo haremos , esta ves subiremos la ultima rama que creamos, dale la del ciclo 3

lo vamos a subir usando docker , ayudame a configurarlo tanto el back como el front 

vamos a usar las secrets and variables de git hub dale 

mira ahora te voy a mostrar la configuracion que use en otro proyecto para que sea automatic

# 🚀 Despliegue del Backend - E-commerce

## ✅ Pre-requisitos Completados en GCP

Según el archivo `datos.txt`, ya tienes configurado:

- ✅ Proyecto GCP: `big-axiom-474503-m5`
- ✅ Cloud SQL: `myproject-db` 
- ✅ Base de datos: `ecommerce`
- ✅ Usuario DB: `ecommerce-user`
- ✅ Artifact Registry: `ecommerce-registry`
- ✅ Service Account: `ecommerce-github-actions@...`

## 📦 Secrets de GitHub a Configurar

Ve a tu repositorio → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Crea los siguientes secrets con los valores de `datos.txt`:

| Secret Name | Valor |
|-------------|-------|
| `GCP_PROJECT_ID` | `big-axiom-474503-m5` |
| `GCP_SA_KEY` | El JSON completo del service account |
| `DB_NAME` | `ecommerce` |
| `DB_USER` | `ecommerce-user` |
| `DB_PASSWORD` | `ecommerce123secure` |
| `DJANGO_SECRET_KEY` | `gf@b8m&+elx2g!r=j03=0!)i7le*+79=wf3q^wu5+^r9q4t3o(` |
| `GROQ_API_KEY` | (tu API key de Groq, opcional) |
| `OPENAI_API_KEY` | (tu API key de OpenAI, opcional) |

## 🔧 Archivos Creados

### Docker
- ✅ `Dockerfile` - Configuración de la imagen Docker
- ✅ `docker-entrypoint.sh` - Script de inicialización
- ✅ `.dockerignore` - Archivos a ignorar en build

### Django
- ✅ `core/management/commands/load_test_data.py` - Comando para cargar datos
- ✅ Settings actualizados para producción con Cloud SQL
- ✅ Requirements con gunicorn y whitenoise

### GitHub Actions
- ✅ `.github/workflows/backend-deploy.yml` - Workflow de despliegue automático

## 🎯 Cómo Desplegar

### Opción 1: Despliegue Automático (Recomendado)

1. **Configura los secrets en GitHub** (ver arriba)

2. **Sube tu código a GitHub:**
   ```bash
   git add .
   git commit -m "Configure backend for Cloud Run deployment"
   git push origin main
   ```

3. **El workflow se ejecutará automáticamente** y:
   - Construirá la imagen Docker
   - La subirá a Artifact Registry
   - La desplegará en Cloud Run
   - Ejecutará migraciones
   - Creará el superusuario
   - Cargará datos de prueba si la BD está vacía

4. **Espera 5-10 minutos** y obtén la URL en los logs del workflow



-------------------


detalles a tomar en cuenta :

solo decime que debo crear en google cloud en mi proyecto asi usando la interfaz 

que tengo que crear en GitHub actions, o secrets 

