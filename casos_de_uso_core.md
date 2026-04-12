# Casos de Uso — Core del Sistema Workflow Engine
### Versión reducida — 4 Ciclos RUP (17 días)

---

## Actores del Sistema

| Actor | Descripción |
|-------|-------------|
| **Administrador** | Diseña políticas, gestiona usuarios y monitorea KPIs |
| **Asesor** | Consulta políticas y ejecuta actividades asignadas |

---

## Resumen de Casos de Uso

| ID | Caso de Uso | Actor | Prioridad |
|----|-------------|-------|-----------|
| CU-01 | Iniciar / cerrar sesión y ver panel por rol | Admin / Asesor | 🔴 Alta |
| CU-02 | Gestionar usuarios (crear, editar, desactivar, asignar rol) | Administrador | 🔴 Alta |
| CU-03 | Crear y editar política de negocio con diagrama swimlane | Administrador | 🔴 Alta |
| CU-04 | Agregar carriles, nodos y conexiones al diagrama | Administrador | 🔴 Alta |
| CU-05 | Definir tipo de flujo en un nodo (lineal, condicional, iterativo, paralelo) | Administrador | 🔴 Alta |
| CU-06 | Crear formulario y asociarlo a un nodo | Administrador | 🔴 Alta |
| CU-07 | Publicar política de negocio | Administrador | 🔴 Alta |
| CU-08 | Crear o modificar política mediante prompt de texto (IA) | Administrador | 🔴 Alta |
| CU-09 | Crear o modificar política mediante prompt de voz (IA) | Administrador | 🔴 Alta |
| CU-10 | Editar política en modo colaborativo (múltiples administradores) | Administrador | 🔴 Alta |
| CU-11 | Buscar y consultar detalle de una política (flujo + formularios) | Asesor | 🔴 Alta |
| CU-12 | Ver monitor personal de actividades asignadas en tiempo real | Asesor | 🔴 Alta |
| CU-13 | Marcar actividad como completada y avanzar el trámite | Asesor | 🔴 Alta |
| CU-14 | Ver dashboard de KPIs y cuellos de botella | Administrador | 🟡 Media |
| CU-15 | Exportar reporte dinámico de rendimiento | Administrador | 🟡 Media |

---

## Ciclo 1 — Inicio (Inception)
> **Objetivo:** Base del sistema. Autenticación, roles, gestión de usuarios y navegación mínima funcional.

| ID | Caso de Uso | Actor | Prioridad |
|----|-------------|-------|-----------|
| CU-01 | Iniciar / cerrar sesión y ver panel por rol | Admin / Asesor | 🔴 Alta |
| CU-02 | Gestionar usuarios (crear, editar, desactivar, asignar rol) | Administrador | 🔴 Alta |

---

## Ciclo 2 — Elaboración (Elaboration)
> **Objetivo:** Núcleo del sistema. Editor de políticas con diagrama, IA por texto y voz, colaboración en tiempo real, formularios y publicación.

| ID | Caso de Uso | Actor | Prioridad |
|----|-------------|-------|-----------|
| CU-03 | Crear y editar política de negocio con diagrama swimlane | Administrador | 🔴 Alta |
| CU-04 | Agregar carriles, nodos y conexiones al diagrama | Administrador | 🔴 Alta |
| CU-05 | Definir tipo de flujo en un nodo (lineal, condicional, iterativo, paralelo) | Administrador | 🔴 Alta |
| CU-06 | Crear formulario y asociarlo a un nodo | Administrador | 🔴 Alta |
| CU-07 | Publicar política de negocio | Administrador | 🔴 Alta |
| CU-08 | Crear o modificar política mediante prompt de texto (IA) | Administrador | 🔴 Alta |
| CU-09 | Crear o modificar política mediante prompt de voz (IA) | Administrador | 🔴 Alta |
| CU-10 | Editar política en modo colaborativo (múltiples administradores) | Administrador | 🔴 Alta |

---

## Ciclo 3 — Construcción (Construction)
> **Objetivo:** El Asesor entra en acción. Búsqueda de políticas, monitor en tiempo real y ejecución del motor de workflow.

| ID | Caso de Uso | Actor | Prioridad |
|----|-------------|-------|-----------|
| CU-11 | Buscar y consultar detalle de una política (flujo + formularios) | Asesor | 🔴 Alta |
| CU-12 | Ver monitor personal de actividades asignadas en tiempo real | Asesor | 🔴 Alta |
| CU-13 | Marcar actividad como completada y avanzar el trámite | Asesor | 🔴 Alta |

---

## Ciclo 4 — Transición (Transition)
> **Objetivo:** Monitoreo, KPIs, detección de cuellos de botella y exportación de reportes dinámicos.

| ID | Caso de Uso | Actor | Prioridad |
|----|-------------|-------|-----------|
| CU-14 | Ver dashboard de KPIs y cuellos de botella | Administrador | 🟡 Media |
| CU-15 | Exportar reporte dinámico de rendimiento | Administrador | 🟡 Media |

---

## Detalle de Casos de Uso

---

### CU-01 — Iniciar / cerrar sesión y ver panel por rol

- **Actor:** Administrador / Asesor
- **Precondición:** El usuario debe estar registrado en el sistema.
- **Flujo principal:**
  1. El usuario ingresa usuario y contraseña.
  2. El sistema valida las credenciales y genera un token JWT.
  3. El sistema redirige al panel correspondiente según el rol:
     - **Administrador:** Editor de políticas, gestión de usuarios y dashboard de KPIs.
     - **Asesor:** Monitor personal de actividades asignadas.
- **Flujo alternativo:** Credenciales incorrectas → el sistema muestra mensaje de error sin revelar cuál campo es incorrecto.
- **Postcondición:** El usuario accede únicamente a las funciones de su rol.

---

### CU-02 — Gestionar usuarios

- **Actor:** Administrador
- **Precondición:** El Administrador debe haber iniciado sesión.
- **Flujo principal:**
  1. El Admin accede al módulo de usuarios.
  2. Puede crear un nuevo usuario asignando nombre, correo, contraseña y rol (Administrador / Asesor).
  3. Puede editar los datos de un usuario existente o desactivarlo.
  4. Un usuario desactivado no puede iniciar sesión.
- **Postcondición:** Los cambios se reflejan de inmediato en el sistema.

---

### CU-03 — Crear y editar política de negocio con diagrama swimlane

- **Actor:** Administrador
- **Precondición:** El Administrador debe haber iniciado sesión.
- **Flujo principal:**
  1. El Admin crea una nueva política asignando nombre y descripción.
  2. El sistema abre el editor visual de diagramas con lienzo en blanco.
  3. El Admin construye el flujo usando carriles (swimlanes), nodos y conexiones.
  4. El Admin puede guardar la política en estado **borrador** para continuar editándola después.
- **Flujo alternativo:** El Admin puede construir o modificar la política usando IA por texto (CU-08) o por voz (CU-09), o editarla en modo colaborativo junto a otro Admin (CU-10).
- **Postcondición:** La política queda guardada en estado borrador hasta que sea publicada.

---

### CU-04 — Agregar carriles, nodos y conexiones al diagrama

- **Actor:** Administrador
- **Precondición:** Debe existir una política abierta en el editor.
- **Flujo principal:**
  1. El Admin agrega un **carril** (swimlane) que representa un departamento o actor responsable.
  2. Dentro de cada carril, el Admin arrastra y suelta **nodos** (actividades, inicio, fin, decisión).
  3. El Admin traza **conexiones** entre nodos para definir el orden del flujo.
  4. El Admin puede etiquetar conexiones con condiciones (para flujos condicionales).
- **Postcondición:** El diagrama refleja la estructura del proceso y queda persistido.

---

### CU-05 — Definir tipo de flujo en un nodo

- **Actor:** Administrador
- **Precondición:** Debe existir al menos un nodo en el diagrama.
- **Flujo principal:**
  1. El Admin selecciona un nodo en el diagrama.
  2. Elige el tipo de comportamiento:
     - **Lineal:** El flujo continúa directamente al siguiente nodo.
     - **Condicional:** El flujo se bifurca según una condición; el Admin define las ramas y sus etiquetas.
     - **Iterativo:** El flujo puede regresar a un nodo anterior hasta que se cumpla una condición de salida.
     - **Paralelo:** Dos o más nodos se activan simultáneamente antes de continuar.
  3. El Admin configura las condiciones o ramas requeridas y guarda.
- **Postcondición:** El motor de workflow usará esta configuración al ejecutar los trámites.

---

### CU-06 — Crear formulario y asociarlo a un nodo

- **Actor:** Administrador
- **Precondición:** Debe existir al menos un nodo en la política.
- **Flujo principal:**
  1. El Admin selecciona un nodo del diagrama.
  2. Crea un formulario con: campos de datos, instrucciones para el Asesor y requisitos que el cliente debe presentar.
  3. Asocia el formulario al nodo y guarda.
- **Postcondición:** Cuando el flujo llegue a ese nodo, el Asesor verá el formulario con la información necesaria para atender al cliente.

---

### CU-07 — Publicar política de negocio

- **Actor:** Administrador
- **Precondición:** La política debe tener al menos un nodo de inicio y un nodo de fin conectados.
- **Flujo principal:**
  1. El Admin revisa la política en el editor.
  2. Hace clic en **Publicar**.
  3. El sistema valida que el flujo sea consistente (sin nodos aislados ni conexiones rotas).
  4. La política pasa a estado **Publicada** y queda disponible para los Asesores.
- **Flujo alternativo:** Si el flujo tiene errores, el sistema los indica y no permite publicar hasta corregirlos.
- **Postcondición:** La política es visible y usable por los Asesores.

---

### CU-08 — Crear o modificar política mediante prompt de texto (IA)

- **Actor:** Administrador
- **Precondición:** El Admin debe estar en el editor de políticas.
- **Flujo principal:**
  1. El Admin escribe una instrucción en lenguaje natural en el panel de IA.
     - Ejemplo: *"Crea un flujo de solicitud de conexión eléctrica con los pasos: Atención al Cliente, Inspección Técnica con condición de aprobación o rechazo, y Activación del Servicio."*
  2. El microservicio de IA (Python + LangChain) interpreta el prompt.
  3. El sistema genera o modifica los nodos, carriles y conexiones en el diagrama automáticamente.
  4. El Admin revisa el resultado y puede aceptarlo, ajustarlo manualmente o regenerar con un nuevo prompt.
- **Postcondición:** El diagrama queda actualizado con la estructura sugerida por la IA.

---

### CU-11 — Crear o modificar política mediante prompt de voz (IA)

- **Actor:** Administrador
- **Precondición:** El Admin debe estar en el editor de políticas con micrófono disponible.
- **Flujo principal:**
  1. El Admin activa la entrada de voz en el panel de IA.
  2. Dicta una instrucción en lenguaje natural.
     - Ejemplo: *"Agrega un paso de validación legal después del área técnica, con dos condiciones: aprobado y rechazado."*
  3. El microservicio de IA convierte el audio a texto (Whisper) y lo procesa con LangChain.
  4. El sistema genera o modifica los nodos, carriles y conexiones en el diagrama automáticamente.
  5. El Admin revisa el resultado y puede aceptarlo, ajustarlo manualmente o dictar una nueva instrucción.
- **Flujo alternativo:** Si el audio no se reconoce con precisión suficiente, el sistema muestra la transcripción obtenida y permite al Admin corregirla antes de procesar.
- **Postcondición:** El diagrama queda actualizado con la estructura dictada por voz.

---

### CU-10 — Editar política en modo colaborativo

- **Actor:** Administrador
- **Precondición:** La política debe estar en estado borrador y al menos dos Administradores deben tener la sesión activa.
- **Flujo principal:**
  1. El Admin abre una política en el editor; el sistema detecta que otro Admin también la tiene abierta.
  2. El sistema habilita el modo colaborativo: ambos Admins ven el cursor y los cambios del otro en tiempo real (WebSocket).
  3. Los cambios de cada Admin se sincronizan en el diagrama sin necesidad de recargar.
  4. El sistema muestra un indicador visual de quién está editando cada nodo para evitar conflictos.
- **Flujo alternativo:** Si dos Admins editan el mismo nodo simultáneamente, el sistema aplica el último cambio guardado y notifica al otro Admin.
- **Postcondición:** Ambos Admins terminan con la misma versión actualizada del diagrama.

---

### CU-11 — Buscar y consultar detalle de una política

- **Actor:** Asesor
- **Precondición:** La política debe estar en estado Publicada.
- **Flujo principal:**
  1. El Asesor escribe una palabra clave o tema en el buscador (ej. "reconexión", "medidor").
  2. El sistema muestra las políticas que coinciden.
  3. El Asesor selecciona una política y visualiza:
     - El diagrama de flujo completo con todos los pasos y carriles.
     - Los formularios asociados a cada nodo con instrucciones y requisitos.
  4. El Asesor usa esta información para orientar correctamente al cliente durante la llamada.
- **Postcondición:** El Asesor tiene visibilidad completa del proceso sin necesidad de recordarlo de memoria.

---

### CU-12 — Ver monitor personal de actividades en tiempo real

- **Actor:** Asesor
- **Precondición:** El Asesor debe haber iniciado sesión.
- **Flujo principal:**
  1. Al ingresar, el Asesor ve su monitor con todas las actividades asignadas a su departamento o rol.
  2. Las actividades se muestran diferenciadas por color según su estado:
     - 🔴 Pendiente / Urgente
     - 🟡 En proceso
     - 🟢 Completada
     - ⚫ Bloqueada
  3. Cuando otro usuario avanza un trámite, el monitor del Asesor se actualiza automáticamente vía **WebSocket/SSE**, sin recargar la página.
- **Postcondición:** El Asesor siempre tiene la vista actualizada de su carga de trabajo sin acción manual.

---

### CU-13 — Marcar actividad como completada y avanzar el trámite

- **Actor:** Asesor
- **Precondición:** El Asesor debe tener una actividad activa asignada.
- **Flujo principal:**
  1. El Asesor abre una actividad desde su monitor.
  2. Revisa el formulario del nodo actual (instrucciones, requisitos, campos).
  3. Completa los campos del formulario y marca la actividad como **atendida**.
  4. El motor de workflow evalúa el tipo de flujo del nodo:
     - **Lineal:** Activa automáticamente el siguiente nodo.
     - **Condicional:** Evalúa la condición y enruta al nodo correspondiente.
     - **Iterativo:** Regresa al nodo anterior si la condición de salida no se cumple.
     - **Paralelo:** Activa en paralelo los nodos siguientes.
  5. El sistema notifica en tiempo real al Asesor del departamento que recibe la siguiente actividad.
- **Postcondición:** El trámite avanza al siguiente paso sin intervención manual del Administrador.

---

### CU-14 — Ver dashboard de KPIs y cuellos de botella

- **Actor:** Administrador
- **Precondición:** Deben existir trámites ejecutados o en curso.
- **Flujo principal:**
  1. El Admin accede al dashboard de KPIs.
  2. El sistema calcula y muestra:
     - Tiempo promedio de atención por nodo y por departamento.
     - Número de trámites activos, finalizados y vencidos.
     - Identificación del nodo con mayor tiempo acumulado (cuello de botella).
  3. Los nodos con demora superior al 30% del promedio general se resaltan visualmente en el diagrama.
- **Postcondición:** El Admin puede identificar dónde optimizar el proceso con datos reales.

---

### CU-15 — Exportar reporte dinámico de rendimiento

- **Actor:** Administrador
- **Precondición:** Deben existir trámites ejecutados o en curso.
- **Flujo principal:**
  1. El Admin accede al dashboard de KPIs o a la vista de cualquier política.
  2. Selecciona los filtros del reporte: política, rango de fechas, departamento, estado de trámites o cualquier combinación.
  3. El sistema genera el reporte en tiempo real con los datos filtrados.
  4. El Admin descarga el reporte en formato **PDF o Excel** según su preferencia.
- **Flujo alternativo:** Si no hay datos para los filtros seleccionados, el sistema informa que no existen registros y sugiere ampliar el rango de búsqueda.
- **Postcondición:** El Admin obtiene un reporte personalizado que puede compartir con directivos o usar para toma de decisiones.
