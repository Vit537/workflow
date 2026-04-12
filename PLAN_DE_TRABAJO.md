# Plan de Trabajo — Workflow Engine
### Versión 1.0

---

## 1. Módulos del Sistema (Alta Cohesión, Bajo Acoplamiento)

La idea es agrupar casos de uso que compartan responsabilidad y datos similares, y que dependan lo menos posible entre sí.

---

### Módulo 1 — Identity & Access Management (IAM)
> **Responsabilidad:** Todo lo relacionado a quién es el usuario, qué puede hacer y cómo entra al sistema.

| ID | Caso de Uso |
|----|-------------|
| CU-01 | Iniciar / cerrar sesión y ver panel por rol |
| CU-02 | Gestionar usuarios (crear, editar, desactivar, asignar rol) |

**Por qué es cohesivo:** Ambos manejan autenticación, tokens JWT y control de acceso. No necesitan saber nada del editor de políticas ni del workflow.

**Cómo se mantiene desacoplado:** Expone solo un endpoint de validación de token. Los demás módulos lo llaman para verificar permisos, pero no conocen la lógica interna de usuarios.

---

### Módulo 2 — Policy Designer (Editor de Políticas)
> **Responsabilidad:** Crear, editar, versionar y publicar políticas de negocio con su diagrama y formularios asociados.

| ID | Caso de Uso |
|----|-------------|
| CU-03 | Crear y editar política de negocio con diagrama swimlane |
| CU-04 | Agregar carriles, nodos y conexiones al diagrama |
| CU-05 | Definir tipo de flujo en un nodo |
| CU-06 | Crear formulario y asociarlo a un nodo |
| CU-07 | Publicar política de negocio |
| CU-08 | Crear o modificar política mediante prompt de texto (IA) |
| CU-09 | Crear o modificar política mediante prompt de voz (IA) |
| CU-10 | Editar política en modo colaborativo |

**Por qué es cohesivo:** Todos trabajan sobre la misma entidad `Política` (nodos, carriles, conexiones, formularios, estado). Comparten el mismo modelo de datos en MongoDB.

**Cómo se mantiene desacoplado:** La IA (CU-08, CU-09) vive en el microservicio Python y se comunica con este módulo mediante una API REST interna. El Módulo 3 solo consume políticas publicadas, nunca escribe en ellas.

---

### Módulo 3 — Workflow Execution & Monitoring
> **Responsabilidad:** Ejecutar trámites basándose en políticas publicadas, notificar asesores y medir rendimiento.

| ID | Caso de Uso |
|----|-------------|
| CU-11 | Buscar y consultar detalle de una política |
| CU-12 | Ver monitor personal de actividades en tiempo real |
| CU-13 | Marcar actividad como completada y avanzar el trámite |
| CU-14 | Ver dashboard de KPIs y cuellos de botella |
| CU-15 | Exportar reporte dinámico de rendimiento |

**Por qué es cohesivo:** Todo gira en torno a la ejecución de un `Trámite` (instancia de una política): avanzar pasos, calcular tiempos, notificar en tiempo real.

**Cómo se mantiene desacoplado:** Solo lee políticas del Módulo 2 (nunca las modifica). Tiene su propia colección en MongoDB para trámites e instancias de nodos activos.

---

## 2. Stack Tecnológico

```
┌─────────────────────────────────────────────────────┐
│                   ANGULAR (Frontend)                 │
│   Módulo IAM │ Policy Designer │ Workflow Monitor    │
└──────────────────────┬──────────────────────────────┘
                       │ REST / WebSocket
                       ▼
┌─────────────────────────────────────────────────────┐
│           SPRING BOOT (Backend principal)            │
│                                                      │
│  [IAM Module]  [Policy Module]  [Workflow Module]    │
│                      │                               │
│              API REST interna                        │
│                      ▼                               │
│         PYTHON (FastAPI - Microservicio IA)          │
│         LangChain + Whisper                          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
             MONGODB (local)
```

| Capa | Tecnología | Rol |
|------|-----------|-----|
| Frontend | Angular 17+ | UI, editor de diagramas, monitor en tiempo real |
| Backend principal | Spring Boot 3 | Lógica de negocio, autenticación JWT, motor de workflow, WebSocket |
| Microservicio IA | Python 3.11 + FastAPI | Interpreta prompts de texto y voz, genera estructura de nodos |
| Base de datos | MongoDB (local tuyo) | Almacena políticas, trámites, usuarios, KPIs |
| Comunicación tiempo real | WebSocket (STOMP + SockJS) | Monitor del asesor, modo colaborativo |

---

### ¿Puedo trabajar con Spring Boot, Angular y Python?

**Spring Boot:** Sí, puedo crear el proyecto completo. Te genero:
- Estructura de paquetes por módulo
- Entidades con anotaciones MongoDB (`@Document`)
- Controladores REST, servicios, repositorios
- Configuración JWT (Spring Security)
- Configuración WebSocket (STOMP)
- Docker Compose para levantar todo junto si lo necesitás

**Python (FastAPI - Microservicio IA):** Sí. Te genero:
- Proyecto FastAPI con endpoints para procesar texto y voz
- Integración con LangChain para interpretar prompts
- Integración con Whisper para audio a texto
- Lo conectamos al Spring Boot con una llamada HTTP desde el servicio de políticas

**Angular:** Sí, lo manejo bien. Te genero:
- Proyecto Angular con módulos separados por cada paquete
- Servicios HTTP con HttpClient
- Guards para proteger rutas por rol
- Integración de librería de diagramas (mxGraph o JointJS)
- Conexión WebSocket con el backend

**MongoDB:** Vos lo instalás local. Yo te digo exactamente qué colecciones crear y qué índices necesitás.

---

## 3. Ciclos de Desarrollo (RUP adaptado)

### Ciclo 1 — Fundación del Sistema
> **Objetivo:** Autenticación funcional + Editor de políticas completo (sin IA ni colaborativo). Al final de este ciclo ya se puede crear y publicar una política.

| ID | Caso de Uso | Módulo |
|----|-------------|--------|
| CU-01 | Iniciar / cerrar sesión y ver panel por rol | IAM |
| CU-02 | Gestionar usuarios | IAM |
| CU-03 | Crear y editar política con diagrama swimlane | Policy Designer |
| CU-04 | Agregar carriles, nodos y conexiones | Policy Designer |
| CU-05 | Definir tipo de flujo en un nodo | Policy Designer |
| CU-06 | Crear formulario y asociarlo a un nodo | Policy Designer |
| CU-07 | Publicar política de negocio | Policy Designer |
| CU-11 | Buscar y consultar detalle de una política | Workflow |

**Total: 8 casos de uso**

**Entregable:** Admin puede crear un flujo completo y publicarlo. Asesor puede buscar y ver la política publicada.

---

### Ciclo 2 — IA, Colaboración y Monitor del Asesor
> **Objetivo:** Agregar capacidades de IA (texto y voz), edición colaborativa y que el asesor vea actividades en tiempo real.

| ID | Caso de Uso | Módulo |
|----|-------------|--------|
| CU-08 | Prompt de texto (IA) | Policy Designer + Microservicio Python |
| CU-09 | Prompt de voz (IA) | Policy Designer + Microservicio Python |
| CU-10 | Edición colaborativa | Policy Designer |
| CU-12 | Monitor personal de actividades en tiempo real | Workflow |

**Total: 4 casos de uso**

**Entregable:** El admin puede crear políticas dictando por voz o texto. Múltiples admins pueden editar a la vez. El asesor ve su bandeja de tareas en tiempo real.

---

### Ciclo 3 — Motor de Workflow y KPIs
> **Objetivo:** El asesor puede ejecutar trámites y el admin puede medir rendimiento.

| ID | Caso de Uso | Módulo |
|----|-------------|--------|
| CU-13 | Marcar actividad como completada y avanzar el trámite | Workflow |
| CU-14 | Dashboard de KPIs y cuellos de botella | Workflow |
| CU-15 | Exportar reporte dinámico | Workflow |

**Total: 3 casos de uso**

**Entregable:** Sistema completamente funcional end-to-end. Un trámite puede ejecutarse paso a paso y se puede medir su rendimiento.

---

## 4. Estándar de Codificación

> **¿Qué es un estándar de codificación?**
> Es un conjunto de reglas que todos los desarrolladores del equipo acuerdan seguir para escribir código de la misma manera. Permite que cualquier persona del equipo pueda leer el código de otro sin confundirse, y que el ingeniero que revise el proyecto encuentre consistencia.

---

### 4.1 Backend — Spring Boot (Java)

**Estándar aplicado: Google Java Style Guide**

Es el estándar más usado en proyectos Spring Boot profesionales. Define cómo nombrar clases, métodos y variables, cómo indentar y cómo organizar el código.

**Reglas clave que vamos a aplicar:**

| Regla | Ejemplo correcto | Ejemplo incorrecto |
|-------|------------------|--------------------|
| Clases en `PascalCase` | `PolicyService` | `policy_service` |
| Métodos y variables en `camelCase` | `getActiveWorkflows()` | `GetActiveWorkflows()` |
| Constantes en `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` | `maxRetryCount` |
| Indentación de 2 espacios | (configurado en IDE) | tabs o 4 espacios |
| Un archivo = una clase pública | `PolicyController.java` | múltiples clases en un archivo |
| Paquetes en minúsculas | `com.workflow.policy` | `com.Workflow.Policy` |

**Estructura de paquetes que usaremos:**
```
com.workflow
├── iam
│   ├── controller
│   ├── service
│   ├── repository
│   └── model
├── policy
│   ├── controller
│   ├── service
│   ├── repository
│   └── model
└── execution
    ├── controller
    ├── service
    ├── repository
    └── model
```

**Ejemplo de cómo se verá el código:**
```java
// PolicyService.java
@Service
public class PolicyService {

  private final PolicyRepository policyRepository;

  public PolicyService(PolicyRepository policyRepository) {
    this.policyRepository = policyRepository;
  }

  public Policy publishPolicy(String policyId) {
    Policy policy = policyRepository.findById(policyId)
        .orElseThrow(() -> new PolicyNotFoundException(policyId));
    policy.setStatus(PolicyStatus.PUBLISHED);
    return policyRepository.save(policy);
  }
}
```

---

### 4.2 Microservicio IA — Python (FastAPI)

**Estándar aplicado: PEP 8** (el mismo que aplicó tu compañero en Django, aplica igual para FastAPI)

**Reglas clave:**

| Regla | Ejemplo correcto | Ejemplo incorrecto |
|-------|------------------|--------------------|
| Funciones y variables en `snake_case` | `process_voice_prompt()` | `processVoicePrompt()` |
| Clases en `PascalCase` | `PromptRequest` | `promptRequest` |
| Indentación de 4 espacios | (estándar Python) | tabs |
| Constantes en `UPPER_SNAKE_CASE` | `MAX_AUDIO_SIZE_MB = 10` | `maxAudioSizeMb` |
| Imports organizados: stdlib → terceros → locales | (ver ejemplo) | imports mezclados |

**Ejemplo de cómo se verá el código:**
```python
# routers/prompt_router.py
from fastapi import APIRouter, HTTPException
from langchain.llms import OpenAI

from schemas.prompt_schema import PromptRequest, PromptResponse
from services.prompt_service import process_text_prompt

router = APIRouter()

@router.post("/prompt/text", response_model=PromptResponse)
def create_policy_from_text(request: PromptRequest):
    """Recibe un prompt de texto y retorna la estructura de nodos generada."""
    if not request.text:
        raise HTTPException(status_code=400, detail="El texto no puede estar vacío")
    return process_text_prompt(request.text)
```

---

### 4.3 Frontend — Angular (TypeScript)

**Estándar aplicado: Angular Style Guide (oficial de Google) + Airbnb para TypeScript**

**Reglas clave:**

| Regla | Ejemplo correcto | Ejemplo incorrecto |
|-------|------------------|--------------------|
| Componentes en `kebab-case` (archivos) | `policy-editor.component.ts` | `PolicyEditor.ts` |
| Clases de componentes en `PascalCase` | `PolicyEditorComponent` | `policyEditorComponent` |
| Servicios con sufijo `Service` | `PolicyService` | `PolicyHelper` |
| Interfaces con prefijo `I` o sin prefijo (equipo decide) | `Policy` o `IPolicy` | `policy_interface` |
| Una responsabilidad por componente | `PolicyListComponent` solo lista | componente que lista Y edita |
| Módulos separados por feature | `policy/`, `iam/`, `workflow/` | todo en una carpeta |

**Estructura de carpetas que usaremos:**
```
src/app
├── iam
│   ├── login
│   ├── user-management
│   └── iam.module.ts
├── policy
│   ├── policy-editor
│   ├── policy-list
│   └── policy.module.ts
├── workflow
│   ├── activity-monitor
│   ├── kpi-dashboard
│   └── workflow.module.ts
├── shared
│   ├── models (interfaces TypeScript)
│   ├── services (HTTP)
│   └── guards (protección de rutas por rol)
└── app.module.ts
```

**Ejemplo de cómo se verá el código:**
```typescript
// services/policy.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Policy } from '../models/policy.model';

@Injectable({ providedIn: 'root' })
export class PolicyService {
  private readonly apiUrl = 'http://localhost:8080/api/policies';

  constructor(private http: HttpClient) {}

  getPublishedPolicies(): Observable<Policy[]> {
    return this.http.get<Policy[]>(`${this.apiUrl}/published`);
  }

  publishPolicy(policyId: string): Observable<Policy> {
    return this.http.patch<Policy>(`${this.apiUrl}/${policyId}/publish`, {});
  }
}
```

---

### 4.4 Resumen: ¿Por qué el ingeniero revisa esto?

El ingeniero no solo revisa que el sistema funcione. También revisa que el código sea:

- **Consistente:** todos escriben igual, no cada uno a su manera
- **Legible:** otro programador puede entenderlo sin explicación
- **Mantenible:** si hay que cambiar algo en 6 meses, se puede hacer sin romper todo
- **Profesional:** demuestra que el equipo conoce buenas prácticas de la industria

Los tres puntos concretos que suele evaluar son:
1. ¿Los nombres de clases, métodos y variables siguen la convención?
2. ¿Está bien organizado en carpetas/paquetes?
3. ¿Hay comentarios que expliquen las partes no obvias?

Si seguimos la estructura y ejemplos que están en este documento, estamos cubiertos en los tres puntos.

---

### 4.5 Idioma del Código — Español

> **Decisión de equipo:** todos los atributos de modelos, campos de base de datos, nombres de métodos propios y variables deben escribirse en **español**. Las únicas excepciones son los métodos impuestos por interfaces de frameworks (Spring Security, Angular) que no se pueden renombrar.

**Regla general:**

| Elemento | Idioma | Ejemplo correcto | Excepción |
|----------|--------|-----------------|-----------|
| Atributos de modelo / BD | Español | `nombre`, `correo`, `creadoEn` | — |
| Métodos propios | Español | `generarToken()`, `iniciarSesion()` | — |
| Variables locales | Español | `politicaActual`, `listaNodos` | — |
| Constantes | Español (UPPER_SNAKE_CASE) | `CLAVE_TOKEN`, `MAX_REINTENTOS` | — |
| Métodos de interfaz (Spring/Angular) | Inglés (obligatorio) | `getUsername()`, `canActivate()`, `loadUserByUsername()` | Impuesto por el framework |
| Rutas HTTP / endpoints | Inglés | `/api/auth/login`, `/api/politicas` | Convención REST |
| Nombres de clases | Español en PascalCase | `Politica`, `TipoFlujo`, `ServicioUsuario` | — |
| Colecciones MongoDB | Español plural | `usuarios`, `politicas` | — |

**Ejemplo en Spring Boot (correcto):**
```java
// ServicioPolitica.java
@Service
public class ServicioPolitica {

  private final PoliticaRepository politicaRepositorio;

  public ServicioPolitica(PoliticaRepository politicaRepositorio) {
    this.politicaRepositorio = politicaRepositorio;
  }

  public Politica publicarPolitica(String idPolitica) {
    Politica politica = politicaRepositorio.findById(idPolitica)
        .orElseThrow(() -> new PoliticaNoEncontradaException(idPolitica));
    politica.setEstado(EstadoPolitica.PUBLICADA);
    return politicaRepositorio.save(politica);
  }
}
```

**Ejemplo en Angular (correcto):**
```typescript
// servicios/politica.service.ts
@Injectable({ providedIn: 'root' })
export class PoliticaService {
  private readonly urlApi = 'http://localhost:8080/api/politicas';

  constructor(private http: HttpClient) {}

  obtenerPoliticasPublicadas(): Observable<Politica[]> {
    return this.http.get<Politica[]>(`${this.urlApi}/publicadas`);
  }

  publicarPolitica(idPolitica: string): Observable<Politica> {
    return this.http.patch<Politica>(`${this.urlApi}/${idPolitica}/publicar`, {});
  }
}
```

**Ejemplo en Python/FastAPI (correcto):**
```python
# enrutadores/enrutador_prompt.py
@enrutador.post("/prompt/texto", response_model=RespuestaPrompt)
def crear_politica_desde_texto(solicitud: SolicitudPrompt):
    """Recibe un prompt de texto y retorna la estructura de nodos generada."""
    if not solicitud.texto:
        raise HTTPException(status_code=400, detail="El texto no puede estar vacío")
    return procesar_prompt_texto(solicitud.texto)
```

---

## 5. Próximos Pasos

1. **Ciclo 1 — Arrancar con Spring Boot:** Crear el proyecto base con los módulos `iam` y `policy`, configuración JWT y conexión a MongoDB.
2. **Ciclo 1 — Angular:** Crear el proyecto Angular con la estructura de módulos definida arriba y las páginas de login + editor de políticas.
3. **Ciclo 2 — Python:** Levantar el microservicio FastAPI con los endpoints de prompt de texto y voz.
4. **Mongodb:** Instalarlo en tu máquina (te digo exactamente qué colecciones crear).
