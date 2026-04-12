# Sistema de Gestión de Políticas de Negocio y Flujos de Trabajo
### WorkFlow Engine — Documento de Especificación del Proyecto

---

## 1. Introducción

En la actualidad, muchas organizaciones —empresas de servicios, cooperativas, entidades financieras y organismos reguladores— gestionan sus procesos internos de forma manual o con herramientas poco integradas, lo que genera inconsistencias en la atención al cliente, tiempos de respuesta elevados y dificultad para identificar ineficiencias operativas.

El presente proyecto propone el desarrollo de un **Sistema de Gestión de Políticas de Negocio y Flujos de Trabajo (Workflow Engine)**, una plataforma web que permite a las organizaciones diseñar, administrar y ejecutar sus procesos internos de manera estructurada, visual y asistida por Inteligencia Artificial.

Como caso de referencia y ejemplo de aplicación, se toma a la **Cooperativa Rural de Electrificación (CRE R.L.)** de Santa Cruz, Bolivia, cuyo proceso de solicitud de conexión eléctrica ejemplifica la complejidad típica de trámites multi-departamentales que este sistema busca resolver.

---

## 2. Antecedentes

La CRE es una cooperativa de servicios eléctricos que atiende a miles de usuarios en Santa Cruz, Bolivia. Sus procesos de atención al cliente —como la instalación de medidores, solicitud de nuevas conexiones o reconexiones— implican múltiples pasos secuenciales que atraviesan distintos departamentos: atención al cliente, área técnica, área legal, entre otros.

Actualmente, cuando un cliente llama para solicitar información sobre cómo instalar un medidor eléctrico, el asesor de atención debe conocer de memoria —o buscar en documentos físicos o dispersos— los requisitos, pasos, formularios y condiciones que aplican a cada trámite. Esto genera:

- **Desinformación al cliente** por parte del asesor si no recuerda todos los pasos.
- **Cuellos de botella** en departamentos que procesan documentación sin visibilidad del estado global.
- **Imposibilidad de medir** el tiempo real que demora cada etapa del proceso.
- **Falta de estandarización** entre asesores sobre cómo ejecutar un mismo trámite.

Esta problemática no es exclusiva de la CRE. Cualquier organización con procesos internos multi-actor enfrenta desafíos similares. Por ello, el sistema se diseña como una plataforma **genérica y reutilizable**, aplicable a bancos, notarías, municipios, clínicas, cooperativas y cualquier entidad con flujos de trabajo estructurados.

---

## 3. Objetivo General

Desarrollar un sistema web de gestión de políticas de negocio y flujos de trabajo que permita a las organizaciones **diseñar, publicar, ejecutar y monitorear** sus procesos internos, facilitando la atención al cliente, la coordinación entre departamentos y la identificación de ineficiencias operativas.

### 3.1 Objetivos Específicos

- Proveer al **Administrador** una herramienta visual e inteligente para crear y editar políticas de negocio mediante diagramas de actividad por carriles (swimlanes), con soporte de IA mediante prompts de texto o audio.
- Proveer al **Asesor/Funcionario** un panel de trabajo en tiempo real donde visualice y gestione únicamente las actividades que le corresponden dentro de cada proceso.
- Implementar un **motor de flujo de trabajo (Workflow Engine)** capaz de ejecutar los cuatro tipos de flujo: lineal, condicional, iterativo y paralelo.
- Detectar y visualizar **cuellos de botella** mediante KPIs de tiempo y carga por departamento.
- Permitir la **creación de formularios** dentro de cada etapa del flujo, que los funcionarios puedan llenar de forma manual o asistida por IA.
- Garantizar la **actualización en tiempo real** del monitor de actividades sin necesidad de recargar la página.

---

## 4. Alcance

### 4.1 Incluido en el sistema

- **Módulo de Autenticación**: Login diferenciado por rol (Administrador / Asesor).
- **Módulo de Administración de Políticas**: Creación y edición colaborativa de flujos de trabajo mediante interfaz visual tipo swimlane, con asistencia por IA (texto y audio).
- **Módulo de Formularios**: Diseño y asociación de formularios a cada nodo/actividad del flujo, con capacidad de llenado manual o por IA.
- **Motor de Workflow**: Ejecución de los cuatro tipos de flujo (lineal, condicional, iterativo, paralelo) y enrutamiento automático de trámites entre departamentos.
- **Panel del Asesor (Monitor)**: Vista personalizada por rol con actividades pendientes, en proceso y completadas, actualizada en tiempo real (WebSockets / SSE).
- **Detección de Cuellos de Botella**: Dashboard de KPIs con tiempos promedio por etapa, actividades vencidas y comparativas entre departamentos.
- **Dos políticas de negocio de ejemplo**: Implementadas para demostración del sistema (ej. Instalación de medidor eléctrico / Solicitud de reconexión de servicio).

### 4.2 Actores del sistema

El sistema contempla únicamente **dos actores**:

| Actor | Rol |
|-------|-----|
| **Administrador** | Diseña políticas, flujos, formularios y gestiona departamentos y usuarios |
| **Asesor / Funcionario** | Ejecuta las actividades que le asigna el flujo, llena formularios y avanza los trámites |

### 4.3 Fuera del alcance

- Integración con sistemas externos (ERP, CRM, sistemas contables).
- Módulo de facturación o pagos en línea.
- Aplicación móvil nativa.
- Gestión de múltiples organizaciones (multitenancy) en esta versión.

---

## 5. Requerimientos Funcionales

### RF-01 — Autenticación y Roles
- El sistema debe permitir el inicio de sesión mediante usuario y contraseña.
- El sistema debe diferenciar el acceso y las vistas según el rol del usuario (Administrador / Asesor).
- Cada usuario debe ver únicamente las funciones y datos correspondientes a su rol.

### RF-02 — Gestión de Políticas de Negocio (Administrador)
- El Administrador debe poder crear, editar y eliminar políticas de negocio.
- Cada política debe poder ser modelada como un diagrama de actividades por carriles (swimlanes), donde cada carril representa un departamento, área o actor responsable.
- El editor debe permitir la colaboración simultánea entre dos o más administradores.
- El sistema debe permitir crear políticas mediante **prompts de texto o audio**, donde la IA interpreta la instrucción y construye o modifica el flujo automáticamente.

### RF-03 — Motor de Flujo de Trabajo (Workflow Engine)
- El motor debe soportar los cuatro tipos de flujo:
  - **Lineal/Secuencial**: Las actividades se ejecutan una tras otra en orden estricto.
  - **Condicional**: El flujo se bifurca según el resultado de una condición evaluada en un nodo.
  - **Iterativo/Cíclico**: Una o más actividades pueden repetirse hasta cumplir una condición de salida.
  - **Paralelo**: Dos o más actividades se ejecutan de forma simultánea antes de continuar.
- El motor debe enrutar automáticamente cada trámite al siguiente departamento según la política definida.

### RF-04 — Gestión de Formularios
- El Administrador debe poder crear formularios y asociarlos a nodos específicos del flujo.
- Los formularios deben indicar qué información se necesita, qué requisitos previos aplican y qué acciones debe realizar el funcionario en esa etapa del trámite.
- El Asesor debe poder **consultar y visualizar** los formularios asociados a cada actividad para obtener información detallada sobre la política y poder orientar correctamente al cliente.
- El Asesor no edita ni modifica formularios; su rol es leer y aplicar la información contenida en ellos durante la atención.

### RF-05 — Panel del Asesor (Monitor en Tiempo Real)
- Al iniciar sesión, el Asesor debe ver un panel con todas las actividades que le corresponden según su departamento y rol.
- Las actividades deben estar **diferenciadas por colores** según su estado:
  - 🔴 Pendiente / Urgente
  - 🟡 En proceso
  - 🟢 Completada
  - ⚫ Bloqueada / Cuello de botella detectado
- El panel debe actualizarse **automáticamente en tiempo real** sin necesidad de recargar la página (WebSockets o Server-Sent Events).
- El Asesor debe poder marcar una actividad como atendida y avanzar el trámite al siguiente paso.

### RF-06 — Detección de Cuellos de Botella
- El sistema debe registrar el tiempo de inicio y fin de cada actividad por trámite.
- El sistema debe calcular y mostrar KPIs operativos:
  - Tiempo promedio de atención por departamento.
  - Tiempo total promedio de un trámite completo.
  - Número de trámites activos, finalizados y vencidos.
  - Identificación del departamento o actividad con mayor tiempo de demora.
- Los cuellos de botella deben visualizarse de forma destacada en el panel del Administrador.

### RF-07 — Búsqueda de Políticas por el Asesor
- El Asesor debe poder buscar en el sistema políticas de negocio relacionadas con la consulta de un cliente.
- El sistema debe mostrar la política encontrada con su flujo, formularios y requisitos de forma clara y legible.

---

## 6. Requerimientos No Funcionales

### RNF-01 — Usabilidad
- La interfaz debe ser **intuitiva y fácil de usar**, priorizando la experiencia del Asesor que opera bajo presión de tiempo durante llamadas con clientes.
- El editor de políticas del Administrador debe tener una curva de aprendizaje baja, comparable a herramientas como n8n o Miro.

### RNF-02 — Tiempo Real
- El panel del Asesor debe reflejar cambios de estado en menos de **2 segundos** desde que ocurren, sin recargar la página.

### RNF-03 — Rendimiento
- El sistema debe soportar múltiples usuarios concurrentes sin degradación notable en el tiempo de respuesta.

### RNF-04 — Disponibilidad
- El sistema debe estar disponible de forma continua durante el horario de operación de la organización.

### RNF-05 — Seguridad
- El acceso al sistema debe estar protegido por autenticación.
- Cada rol debe tener restricciones de acceso estrictas: el Asesor no puede modificar políticas ni ver reportes globales.
- Los datos de los trámites deben almacenarse de forma segura.

### RNF-06 — Escalabilidad
- El sistema debe diseñarse para soportar la incorporación de nuevos tipos de flujo, actores y organizaciones en versiones futuras.

### RNF-07 — Compatibilidad
- La aplicación debe funcionar correctamente en navegadores modernos (Chrome, Firefox, Edge) tanto en escritorio como en dispositivos móviles.

---

## 7. Políticas de Negocio de Ejemplo

Para la demostración del sistema se implementarán dos políticas de negocio basadas en el contexto de la CRE:

### Política 1 — Solicitud de Nueva Conexión Eléctrica (Instalación de Medidor)
Flujo multi-departamental que incluye: Atención al Cliente → Área Técnica → Área Legal → Activación del Servicio.
Aplica flujo **condicional** (inspección técnica aprueba o rechaza) y **secuencial**.

### Política 2 — Solicitud de Reconexión de Servicio
Flujo que incluye verificación de deuda, validación técnica y reactivación.
Aplica flujo **iterativo** (reintentos si la deuda no es cancelada) y **condicional**.

---

## 8. Glosario

| Término | Definición |
|--------|------------|
| **Política de negocio** | Conjunto de reglas y pasos definidos que describen cómo debe ejecutarse un proceso dentro de la organización |
| **Workflow Engine** | Motor que ejecuta y enruta los pasos de un flujo de trabajo según las reglas de la política definida |
| **Swimlane / Carril** | División visual del diagrama de actividades que representa a un actor, departamento o sistema responsable |
| **Nodo** | Cada paso, actividad o decisión dentro del flujo de trabajo |
| **Cuello de botella** | Etapa del proceso donde se acumula trabajo o se generan retrasos que afectan el tiempo total del trámite |
| **KPI** | Indicador Clave de Rendimiento; métrica usada para medir la eficiencia de un proceso |
| **SSE / WebSocket** | Tecnologías web que permiten comunicación en tiempo real entre el servidor y el navegador sin recargar la página |
| **Formulario** | Hoja de instrucciones y campos de datos asociada a un nodo, que el funcionario debe completar para avanzar el trámite |
