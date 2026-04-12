¿Qué librería usar para el diagramador?
Para Angular, la mejor opción actualmente es mxGraph o su versión más moderna maxGraph (el sucesor oficial mantenido por la comunidad). Es exactamente lo que usa Draw.io internamente, así que ya está probado para swimlanes complejos.
Otra opción más moderna y fácil es JointJS que tiene soporte nativo para carriles y es más fácil de integrar.
Te recomiendo maxGraph porque:

Swimlanes nativas sin configuración extra
Drag & drop incluido
Exporta e importa XML/JSON del diagrama
Amplia documentación


¿Cómo se divide el trabajo Angular vs Spring Boot?
Aquí está la clave del flujo:
Angular (Vista)                    Spring Boot (Lógica + Datos)
─────────────────                  ────────────────────────────
mxGraph renderiza                  Guarda la política como JSON
el diagrama visual        ←──────→ en MongoDB
                           REST
El admin mueve nodos,              El backend valida la estructura
conecta carriles,                  del flujo (que no haya nodos
arrastra actividades     ─────────→ huérfanos, condiciones sin
                                   salida, etc.)

Cuando guarda:                     Recibe el JSON del diagrama,
Angular serializa el    ─────────→ lo parsea y construye el
diagrama a JSON                    modelo interno del workflow

El flujo concreto paso a paso
1 — El Admin abre el editor
Angular carga el componente del editor
        ↓
GET /api/politicas/{id}  →  Spring Boot  →  MongoDB
        ↓
Devuelve el JSON de la política (nodos, conexiones, carriles)
        ↓
Angular pasa ese JSON a mxGraph → renderiza el diagrama visual
2 — El Admin edita (arrastra, conecta, agrega nodos)
Todo esto ocurre 100% en el navegador
mxGraph maneja el drag & drop localmente
Angular solo escucha los eventos del diagrama
Nada va al backend todavía → es solo vista
3 — El Admin guarda
Admin presiona "Guardar"
        ↓
Angular le pide a mxGraph el estado actual del diagrama
mxGraph devuelve un JSON con todos los nodos, conexiones y carriles
        ↓
Angular → POST /api/politicas/{id}  →  Spring Boot
        ↓
Spring Boot recibe el JSON, lo valida y lo guarda en MongoDB
4 — El Admin usa IA para generar nodos
Admin escribe: "Agrega un paso de validación legal con condición"
        ↓
Angular → POST /api/ia/generar-nodo → Python (FastAPI)
        ↓
FastAPI + LangChain interpreta el prompt
Devuelve un JSON con el nuevo nodo y sus conexiones
        ↓
Angular recibe el JSON e inyecta los nodos en mxGraph
El diagrama se actualiza visualmente

¿Qué hace cada uno exactamente?
ResponsabilidadAngular + mxGraphSpring BootRenderizar el diagrama✅❌Drag & drop de nodos✅❌Guardar estado visual✅ temporal✅ permanenteValidar estructura del flujo❌✅Ejecutar el workflow❌✅Enrutar al siguiente paso❌✅Detectar cuellos de botella❌✅

Lo más importante a entender
Angular no sabe nada de lógica de negocio. Solo sabe dibujar y capturar lo que el admin hace. Cuando el admin conecta dos nodos, Angular no sabe si esa conexión es válida o no — eso lo valida Spring Boot cuando recibe el JSON.
Spring Boot no sabe nada de píxeles. Solo recibe un JSON con la estructura del flujo, lo guarda y lo ejecuta. No le importa si el nodo está a la izquierda o derecha en pantalla, solo le importa que el nodo A conecta con el nodo B bajo la condición C.
Esa separación es lo que hace el sistema limpio, escalable y fácil de mantener.