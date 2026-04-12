# Guía: Crear una Política con Formulario (Rol ADMIN)

---

## Requisitos previos

| Servicio | Comando de arranque | Puerto |
|---|---|---|
| MongoDB | (corre como servicio) | 27017 |
| Backend Spring Boot | `mvn spring-boot:run` en `/backend` | 8080 |
| AI Service (Python) | `uvicorn main:app --reload` en `/ai-service` | 8001 |
| Frontend Angular | `ng serve` en `/frontend` | 4200 |

Ingresar con usuario **ADMIN** (ver `credenciales.md`).

---

## Paso 1 — Crear la política

1. En el navbar, hacer clic en **Políticas**.
2. Clic en el botón **"Nueva Política"** (ícono `+`).
3. Ingresar:
   - **Nombre:** p. ej. `Solicitud de Vacaciones`
   - **Descripción:** breve resumen del proceso
4. Clic en **Crear**. El sistema crea la política en estado `BORRADOR` y abre el **Editor de Diagrama**.

---

## Paso 2 — Diseñar el diagrama (modo manual)

El editor usa un canvas de tipo **swimlane colaborativo** (MaxGraph).

### 2.1 Agregar carriles (swimlanes)

Un carril = un actor/departamento responsable.

1. Clic en **"+ Agregar Carril"** en el panel lateral.
2. Ingresar el nombre del carril, p. ej. `Empleado`.
3. Repetir para cada actor: `RRHH`, `Gerencia`, etc.

### 2.2 Agregar nodos

Seleccionar el tipo de nodo en el panel y arrastrarlo al carril correspondiente:

| Tipo | Ícono | Cuándo usarlo |
|---|---|---|
| **INICIO** | ⬤ verde | Punto de entrada del proceso. Solo uno. |
| **ACTIVIDAD** | ▭ azul | Tarea concreta que ejecuta un actor. |
| **DECISIÓN** | ◇ amarillo | El flujo se bifurca según una condición. |
| **COMPUERTA_PARALELA** | ✦ | Activa varias ramas al mismo tiempo. |
| **COMPUERTA_UNIÓN** | ✦ | Espera a que todas las ramas terminen. |
| **FIN** | ⬤ rojo | Fin del proceso. |

> **Regla:** todo diagrama debe tener exactamente **1 INICIO** y al menos **1 FIN**.

### 2.3 Conectar nodos

1. Pasar el cursor sobre el borde de un nodo → aparece un punto de conexión.
2. Arrastrar hacia el nodo destino.
3. Si la conexión es de un nodo DECISIÓN, se abre un campo para escribir la **etiqueta de la rama** (p. ej. `Aprobado` / `Rechazado`).

---

## Paso 3 — Configurar propiedades de un nodo

Hacer **clic izquierdo** sobre cualquier nodo del canvas → se abre el **panel de propiedades** a la derecha.

### Pestaña "Flujo"

| Campo | Descripción |
|---|---|
| **Etiqueta** | Nombre visible en el diagrama |
| **Tipo de Nodo** | INICIO / ACTIVIDAD / DECISIÓN / etc. |
| **Tipo de Flujo** | Ver tabla abajo |

#### Tipos de flujo disponibles

| Tipo de Flujo | Cuándo usarlo |
|---|---|
| `LINEAL` | El paso pasa directamente al siguiente. Uso general. |
| `CONDICIONAL` | El asesor debe elegir una rama (p. ej. Aprobado / Rechazado). |
| `ITERATIVO` | El paso puede regresar (p. ej. corrección → revisar de nuevo). |
| `PARALELO` | Varias actividades ocurren en simultáneo. |

### Pestaña "Formulario"

Define qué datos debe capturar el asesor al ejecutar este paso.

1. Ingresar **Título del formulario** y **Instrucciones**.
2. Agregar **Requisitos** (lista de documentos necesarios).
3. En **Campos**, clic en **"+ Agregar campo"** y completar:

| Campo del campo | Descripción |
|---|---|
| **Nombre interno** | Clave en el JSON, sin espacios (`dias_solicitados`) |
| **Etiqueta** | Texto visible al asesor (`Días solicitados`) |
| **Tipo** | TEXTO / NÚMERO / FECHA / SÍ·NO / ARCHIVO / SELECCIÓN |
| **Requerido** | Checkbox — si debe completarse obligatoriamente |

4. Clic en **Guardar campo**.

> Los campos quedan guardados en el nodo. Repetir para cada actividad del diagrama que necesite capturar datos.

---

## Paso 4 — Guardar el diagrama

Clic en **"Guardar Diagrama"** (ícono de disco) en la barra superior del editor.

El sistema persiste los carriles, nodos, conexiones y formularios en MongoDB.

---

## Paso 5 — Publicar la política

Solo las políticas en estado `PUBLICADA` pueden ser iniciadas por los asesores.

1. Clic en el botón **"Publicar"** (ícono `publish`).
2. Confirmar en el diálogo.
3. El estado cambia de `BORRADOR` → `PUBLICADA`.

> ⚠️ Una vez publicada, los asesores pueden ver e iniciar trámites de esta política.

---

## Paso 6 — Usar la IA para generar el diagrama

En lugar de dibujar manualmente, se puede describir el proceso en lenguaje natural y la IA genera el diagrama completo.

### Cómo activarlo

1. En el editor, clic en el botón **"Asistente IA"** (ícono `smart_toy` o varita mágica).
2. Se abre el panel de IA a la derecha.
3. Escribir el prompt en el campo de texto.
4. Clic en **"Generar"**.
5. El sistema llama al AI Service (puerto 8001, modelo LLaMA 3 via Groq).
6. El diagrama generado se **carga automáticamente** en el canvas.
7. Se puede ajustar manualmente después.

### Estructura que entiende la IA

La IA produce:
- **Carriles** con nombres de departamentos/actores
- **Nodos** tipados (INICIO, ACTIVIDAD, DECISIÓN, FIN, etc.)
- **Conexiones** con etiquetas de condición cuando hay bifurcaciones
- **Tipo de flujo** por nodo (LINEAL, CONDICIONAL, ITERATIVO, PARALELO)

---

## Ejemplos de prompts para la IA

### Ejemplo 1 — Proceso lineal simple

```
Proceso de solicitud de vacaciones:
1. El empleado completa el formulario de solicitud con fechas y días solicitados.
2. RRHH revisa la disponibilidad y aprueba o rechaza.
3. Si es aprobado, el sistema notifica al empleado y registra las vacaciones.
4. Si es rechazado, RRHH envía observaciones al empleado.
```

---

### Ejemplo 2 — Proceso con aprobación multinivel

```
Proceso de aprobación de gastos:
- El empleado crea una solicitud de gasto con monto, concepto y justificación.
- Su jefe directo revisa: si el monto es menor a $500 puede aprobar directamente.
- Si el monto supera $500, debe pasar también a aprobación del director financiero.
- Finanzas procesa el pago una vez aprobado.
- Si alguna aprobación es rechazada, se notifica al empleado con motivo.
```

---

### Ejemplo 3 — Proceso iterativo (con correcciones)

```
Proceso de revisión de informes técnicos:
1. El ingeniero sube el informe al sistema.
2. El supervisor técnico lo revisa.
3. Si tiene observaciones, regresa al ingeniero para corrección y vuelve a revisión.
4. Cuando el supervisor lo aprueba, pasa a firma del gerente de área.
5. El gerente firma y el documento queda publicado.
```

---

### Ejemplo 4 — Proceso con tareas paralelas

```
Proceso de incorporación de nuevo empleado (onboarding):
1. RRHH registra los datos del empleado en el sistema.
2. En paralelo: TI crea las cuentas de acceso, y Logística prepara el equipo de trabajo.
3. Una vez que ambas áreas completan sus tareas, RRHH agenda la inducción.
4. El empleado asiste a la sesión de inducción.
5. Proceso completado.
```

---

### Ejemplo 5 — Proceso de compras con múltiples actores

```
Diseña un proceso de compras con los siguientes pasos:
- Solicitante: llena la orden de compra indicando producto, cantidad y proveedor sugerido.
- Presupuesto: verifica disponibilidad presupuestaria. Si no hay presupuesto, rechaza.
- Compras: contacta al proveedor, negocia precio y emite la orden oficial.
- Almacén: recibe el producto y verifica que coincide con la orden.
- Contabilidad: registra la factura y programa el pago.
```

---

### Tips para mejores resultados con la IA

| Tip | Detalle |
|---|---|
| **Nombra los actores** | Mencionar quién hace cada paso → la IA crea los carriles correctos. |
| **Describe bifurcaciones** | "Si X entonces A, sino B" → la IA usa tipo CONDICIONAL. |
| **Menciona ciclos** | "Si hay observaciones, regresa a..." → la IA usa tipo ITERATIVO. |
| **Menciona paralelismo** | "Al mismo tiempo / en paralelo" → la IA usa COMPUERTA_PARALELA. |
| **Sé específico** | Cuantos más detalles, más preciso es el diagrama generado. |
| **Ajusta luego** | Siempre se puede editar manualmente nodos, conexiones y formularios después. |

---

## Edición colaborativa en tiempo real

Si otro administrador abre la misma política al mismo tiempo:

- Los cambios en el diagrama se sincronizan vía **WebSocket** (`/topic/politica/{id}`).
- En la esquina superior derecha del editor aparecen los avatares/nombres de los **usuarios presentes**.
- Los cambios de uno se reflejan instantáneamente en el canvas del otro.

> Requiere que el backend esté corriendo con STOMP/SockJS habilitado.

---

## Flujo completo resumido

```
ADMIN login
  └─► Políticas → Nueva Política
        └─► Editor de Diagrama
              ├─► Manual: agregar carriles → nodos → conexiones → configurar formularios
              └─► IA: escribir prompt → Generar → ajustar si es necesario
                    └─► Guardar Diagrama
                          └─► Publicar
                                └─► Asesores ya pueden iniciar trámites
```
