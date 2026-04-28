# Flujo Completo del Sistema de Workflow

## Visión general

El sistema conecta a **clientes** (app Flutter, sin cuenta) con **asesores** (panel web Angular, con JWT). El cliente envía una consulta, el asesor la revisa, asigna una póliza/proceso y crea un trámite paso a paso. El cliente completa formularios por departamento desde la app.

```
Cliente (Flutter)          Backend (Spring Boot)         Asesor (Angular)
─────────────────          ─────────────────────         ────────────────
Envía consulta     ──────► Guarda consulta           ──► Notifica en tiempo real
                                                          (WebSocket /topic/actividades)

Espera notificación        Asesor crea trámite        ◄── Asesor asigna póliza
push (FCM)        ◄──────  Activa primer paso             y crea el trámite

Rellena formulario ──────► Guarda datos paso          ──► Asesor ve datos en vivo
por departamento                                          (WebSocket)

                           Asesor avanza el paso       ◄── Asesor marca paso
Siguiente paso ◄─────────  Activa siguiente paso           COMPLETADO
```

---

## PARTE 1 — Lo que hace el CLIENTE

### Paso 1 — Enviar la consulta

El cliente abre la app Flutter y llena el formulario inicial:

| Campo | Requerido | Ejemplo |
|-------|-----------|---------|
| Nombre completo | Sí | `Juan Pérez García` |
| Correo electrónico | No* | `juan.perez@gmail.com` |
| Teléfono | No* | `+591 70012345` |
| Descripción de la consulta | Sí | `Quiero asegurar mi casa en la zona norte, valor estimado 80,000 USD` |

> *Se recomienda ingresar correo o teléfono para que el asesor pueda contactarlo.

**Lo que devuelve el sistema:**

```json
{
  "consultaId": "682d3f1a9c4e2b001f3a7c55",
  "clienteNombre": "Juan Pérez García",
  "estado": "PENDIENTE",
  "creadaEn": "2026-04-27T14:30:00Z"
}
```

> **IMPORTANTE:** El cliente debe guardar el `consultaId`. Es su único identificador en el sistema.

---

### Paso 2 — Esperar la atención del asesor

Después de enviar la consulta, el cliente ve la pantalla de confirmación que muestra:

- Su ID de consulta (con botón copiar)
- Estado actual: **"Pendiente de revisión"**
- Mensaje: *"Recibirás una notificación push cuando el asesor atienda tu consulta."*

El cliente puede:
- Pulsar **"Actualizar estado"** para refrescar manualmente
- Esperar la notificación push (FCM) que llega automáticamente

---

### Paso 3 — Recibir la notificación y acceder al trámite

Cuando el asesor atiende la consulta y crea el trámite, el cliente recibe una notificación push con el mensaje configurado por el asesor (ej: *"Tu consulta fue atendida. Por favor sigue los pasos del trámite."*).

Al actualizar el estado, la pantalla de confirmación muestra el botón **"Ir a mi trámite"** con el ID del trámite creado.

---

### Paso 4 — Completar los pasos del trámite

El cliente accede a la pantalla **"Mi trámite"** que muestra:

```
┌─────────────────────────────────────────┐
│  Paso 2 de 5          [Inspección]      │
│  ████████░░░░░░░░░░░░  40%              │
│  Inspección del inmueble                │
└─────────────────────────────────────────┘
```

Por cada paso, el cliente ve un formulario diferente según el departamento. Ejemplo de campos:

**Departamento: Inspección**
- Dirección exacta del inmueble → campo `TEXTO`
- Número de habitaciones → campo `NUMERO`
- ¿Tiene sistema eléctrico actualizado? → campo `BOOLEANO` (switch sí/no)
- Foto frontal de la casa → campo `ARCHIVO` (cámara o galería)
- Foto del interior → campo `ARCHIVO`

**El cliente completa el formulario y pulsa "Enviar información".**

El sistema:
1. Sube cada archivo (foto/documento) al servidor
2. Guarda los datos de texto
3. Notifica al asesor en tiempo real vía WebSocket
4. Muestra confirmación: *"✓ Datos enviados correctamente"*

---

### Paso 5 — Esperar avance a siguiente paso

Después de enviar los datos, el paso queda en estado **EN_PROGRESO**. El asesor revisa los datos, puede solicitar correcciones (marcando el paso como **BLOQUEADO**) o avanzar marcándolo **COMPLETADO**.

Cuando el asesor avanza al siguiente paso, el cliente recibe otra notificación push y puede ver el nuevo formulario.

---

### Paso 6 — Trámite completado

Cuando todos los pasos están completados, la pantalla muestra:

```
     ✓
  ¡Trámite completado!
  Todos los pasos han sido procesados.
  Te notificaremos el resultado.
```

---

## PARTE 2 — Lo que hace el ASESOR

### Paso 1 — Ver las consultas entrantes

El asesor inicia sesión en el panel web Angular con su usuario y contraseña:

```
POST /api/auth/login
{ "correo": "asesor@empresa.com", "contrasena": "miPassword123" }
```

El panel muestra en tiempo real (WebSocket) todas las consultas en estado **PENDIENTE** con:
- Nombre del cliente
- Descripción de la consulta
- Fecha y hora de creación
- Botón **"Atender"**

---

### Paso 2 — Verificar la identidad del cliente (doble verificación)

Antes de atender, el asesor puede verificar al cliente para evitar errores:

```
GET /api/consultas/verificar?correo=juan.perez@gmail.com&descripcion=asegurar mi casa
```

La respuesta incluye:
```json
{
  "consultaId": "682d3f1a9c4e2b001f3a7c55",
  "clienteNombre": "Juan Pérez García",
  "clienteCorreo": "juan.perez@gmail.com",
  "descripcion": "Quiero asegurar mi casa en la zona norte...",
  "descripcionCoincide": true,
  "estadoConsulta": "PENDIENTE"
}
```

Si `descripcionCoincide: true`, el asesor confirma que habla con el cliente correcto.

---

### Paso 3 — Asignar una póliza y crear el trámite

El asesor selecciona la póliza/proceso adecuado para el caso del cliente y pulsa **"Atender consulta"**:

```
POST /api/consultas/{consultaId}/atender
Authorization: Bearer <jwt-token>
{
  "mensajeAsesor": "Hola Juan, tu consulta fue atendida. Por favor completa los pasos del trámite.",
  "politicaId": "682d1a2b3c4d5e6f7a8b9c0d"
}
```

El sistema automáticamente:
1. Crea el trámite con todos los pasos de la póliza
2. Activa el primer paso (estado **EN_PROGRESO**)
3. Vincula el trámite a la consulta
4. Envía notificación push al cliente (FCM)

---

### Paso 4 — Monitorear el trámite (monitor en vivo)

El panel del asesor muestra el **monitor de trámites activos** en tiempo real. Para cada trámite asignado, el asesor ve:

| Trámite | Cliente | Paso actual | Departamento | Estado |
|---------|---------|-------------|--------------|--------|
| `682d...` | Juan Pérez | 2 / 5 | Inspección | EN_PROGRESO |
| `893f...` | María López | 1 / 3 | Documentación | PENDIENTE |

Al seleccionar un trámite, el asesor ve todos los pasos con sus datos:

```
Paso 1 — Datos personales         [COMPLETADO ✓]
  nombre: Juan Pérez García
  telefono: +591 70012345

Paso 2 — Inspección del inmueble  [EN_PROGRESO ●]
  direccion: Calle 5 Norte #123, Zona Norte
  habitaciones: 4
  electricidad_actualizada: true
  foto_frontal: uploads/682d.../paso2/foto_frontal_abc.jpg
  foto_interior: (pendiente)

Paso 3 — Tasación                 [PENDIENTE]
Paso 4 — Revisión legal           [PENDIENTE]
Paso 5 — Emisión de póliza        [PENDIENTE]
```

---

### Paso 5 — Gestionar el estado de los pasos

El asesor puede cambiar el estado de cualquier paso sin avanzar el flujo:

```
PATCH /api/tramites/{tramiteId}/pasos/{nodoId}/estado
Authorization: Bearer <jwt-token>
{ "estado": "BLOQUEADO" }
```

| Estado | Uso |
|--------|-----|
| `PENDIENTE` | El paso aún no ha iniciado |
| `EN_PROGRESO` | El cliente está completando este paso ahora |
| `BLOQUEADO` | El asesor bloqueó el paso (ej: falta información, hay errores) |

> El estado `COMPLETADO` solo se puede asignar mediante el endpoint de completar paso (no desde el PATCH de estado), para garantizar que el flujo avance correctamente.

---

### Paso 6 — Descargar archivos subidos por el cliente

Cuando el cliente sube fotos o documentos, el asesor puede descargarlos:

```
GET /api/tramites/{tramiteId}/pasos/{nodoId}/archivos?rutaRelativa=uploads/682d.../paso2/foto_frontal_abc.jpg
Authorization: Bearer <jwt-token>
```

El archivo se descarga directamente desde el navegador del asesor.

---

### Paso 7 — Avanzar el trámite al siguiente paso

Cuando el asesor ha revisado toda la información del paso actual y está conforme:

```
POST /api/tramites/{tramiteId}/pasos/{nodoId}/completar
Authorization: Bearer <jwt-token>
{
  "datosFormulario": { "observacion_asesor": "Inmueble verificado, condiciones aceptables" }
}
```

El sistema:
1. Marca el paso actual como **COMPLETADO**
2. Activa el siguiente paso disponible
3. Envía notificación push al cliente avisando del nuevo paso
4. Actualiza el monitor en tiempo real para todos los asesores conectados

---

## PARTE 3 — Ejemplo completo de caso real

### Caso: Seguro de hogar para Juan Pérez

---

#### Día 1 — El cliente envía la consulta

**Juan** abre la app y escribe:
- Nombre: `Juan Pérez García`
- Correo: `juan.perez@gmail.com`
- Descripción: `Quiero asegurar mi casa, está en zona norte, construcción de ladrillo, 2 pisos`

El sistema devuelve `consultaId: "682d3f1a9c4e2b001f3a7c55"`.

---

#### Día 1 (30 min después) — El asesor atiende la consulta

**Asesor Carlos** ve la consulta en el panel. La verifica con el correo del cliente. Todo coincide.

Carlos selecciona la póliza **"Seguro Hogar Estándar"** que tiene 4 pasos:
1. Datos del inmueble (Dep. Captación)
2. Inspección fotográfica (Dep. Inspección)
3. Tasación (Dep. Evaluación)
4. Emisión (Dep. Emisión)

Carlos pulsa **"Atender"** con el mensaje: *"Hola Juan, tu consulta fue procesada. Por favor completa el formulario de tu inmueble."*

Juan recibe una notificación push en su celular.

---

#### Día 1 — El cliente completa el Paso 1

Juan abre la app, ve la notificación y va a **"Mi trámite"**:

```
Paso 1 de 4   [Captación]
Datos del inmueble
```

Campos que completa:
- Dirección: `Calle 5 Norte #123, Zona Norte, Cochabamba`
- Tipo construcción: `Ladrillo` (selección)
- Número de pisos: `2`
- Año de construcción: `2015`
- ¿Tiene alarma? → `Sí` (switch)

Pulsa **"Enviar información"**. El asesor Carlos ve los datos aparecer en tiempo real en su monitor.

---

#### Día 1 — El asesor avanza al Paso 2

Carlos revisa los datos, están correctos. Completa el paso:

```
POST /api/tramites/{id}/pasos/{paso1Id}/completar
{ "datosFormulario": { "verificado_por": "Carlos A." } }
```

Juan recibe notificación: *"¡Tu trámite avanzó! Nuevo paso disponible."*

---

#### Día 2 — El cliente completa el Paso 2

Juan abre la app y ve:

```
Paso 2 de 4   [Inspección]
Inspección fotográfica
```

Campos:
- Foto frontal del inmueble → Juan toma foto con la cámara
- Foto lateral → Juan sube desde la galería
- Foto del interior → Juan toma foto
- Observaciones: `La fachada fue pintada el año pasado`

Sube las 3 fotos + texto. Todo llega al servidor y el asesor lo ve en su panel.

---

#### Día 2 — El asesor bloquea el paso por fotos insuficientes

Carlos revisa las fotos pero la foto del interior está muy oscura:

```
PATCH /api/tramites/{id}/pasos/{paso2Id}/estado
{ "estado": "BLOQUEADO" }
```

El asesor contacta a Juan por teléfono para pedir mejores fotos. Juan vuelve a la app y sube nuevas fotos. El asesor desbloquea el paso y lo completa.

---

#### Días 3-4 — Tasación y Emisión

Los pasos 3 y 4 son procesados internamente por el departamento de evaluación y emisión. El cliente no necesita ingresar datos adicionales — los asesores de cada departamento los completan con su información interna.

---

#### Día 5 — Trámite completado

Cuando Carlos completa el último paso, Juan ve en su app:

```
     ✓
  ¡Trámite completado!
  Todos los pasos han sido procesados.
  Te notificaremos el resultado.
```

---

## PARTE 4 — Referencia rápida de endpoints

### Endpoints PÚBLICOS (cliente Flutter, sin JWT)

| Método | URL | Descripción |
|--------|-----|-------------|
| `POST` | `/api/consultas` | Crear nueva consulta |
| `POST` | `/api/consultas/{id}/fcm-token` | Registrar token push |
| `GET` | `/api/consultas/{id}/estado` | Ver estado de la consulta |
| `GET` | `/api/consultas/{id}/paso-actual` | Ver paso activo del trámite |
| `POST` | `/api/tramites/{id}/pasos/{nodoId}/datos-cliente` | Enviar datos del formulario |
| `POST` | `/api/tramites/{id}/pasos/{nodoId}/archivos?campo=X` | Subir archivo |

### Endpoints PRIVADOS (asesor/admin, requieren JWT)

| Método | URL | Descripción |
|--------|-----|-------------|
| `POST` | `/api/auth/login` | Iniciar sesión |
| `GET` | `/api/consultas` | Listar todas las consultas |
| `GET` | `/api/consultas/verificar?correo=X&descripcion=Y` | Verificar identidad del cliente |
| `POST` | `/api/consultas/{id}/atender` | Atender consulta y crear trámite |
| `GET` | `/api/tramites/asesor` | Monitor de trámites del asesor |
| `GET` | `/api/tramites/{id}` | Detalle de un trámite |
| `PATCH` | `/api/tramites/{id}/pasos/{nodoId}/estado` | Cambiar estado de un paso |
| `POST` | `/api/tramites/{id}/pasos/{nodoId}/completar` | Completar paso y avanzar flujo |
| `GET` | `/api/tramites/{id}/pasos/{nodoId}/archivos?rutaRelativa=X` | Descargar archivo del cliente |

---

## PARTE 5 — Estados del sistema

### Estados de una Consulta

| Estado | Significado |
|--------|-------------|
| `PENDIENTE` | Recién creada, esperando atención del asesor |
| `EN_ATENCION` | El asesor la atendió y creó el trámite |
| `COMPLETADA` | El trámite asociado fue completado |

### Estados de un Trámite

| Estado | Significado |
|--------|-------------|
| `ACTIVO` | El trámite está en curso |
| `COMPLETADO` | Todos los pasos fueron completados |
| `CANCELADO` | El trámite fue cancelado |

### Estados de un Paso (PasoTramite)

| Estado | Significado |
|--------|-------------|
| `PENDIENTE` | El paso existe pero aún no ha iniciado |
| `EN_PROGRESO` | Es el paso activo actual (el cliente lo ve) |
| `BLOQUEADO` | El asesor lo bloqueó, el cliente debe corregir algo |
| `COMPLETADO` | El asesor lo marcó como completado, flujo avanzó |

### Tipos de campo en formularios

| Tipo | Renderiza como |
|------|----------------|
| `TEXTO` | Campo de texto libre |
| `NUMERO` | Teclado numérico |
| `FECHA` | Selector de fecha (date picker) |
| `BOOLEANO` | Switch sí/no |
| `SELECCION` | Dropdown con opciones predefinidas |
| `ARCHIVO` | Botones "Cámara" y "Galería/Archivo" |
