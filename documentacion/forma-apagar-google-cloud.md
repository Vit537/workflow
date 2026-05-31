Exacto, Henry. Revisar solo la pestaña de Billing es lo más directo, porque ahí ves si hay cargos activos. Pero ojo: Billing te muestra el resultado (los costos), no siempre el origen. Es decir, puedes ver que tienes USD 0.00, pero aun así tener recursos encendidos que podrían empezar a generar consumo si se usan.

👉 Lo más seguro es hacer dos pasos:

Billing (Facturación)

Entra a la pestaña de Facturación del proyecto.

Si ves que todo está en USD 0.00 y no hay cargos recientes, significa que no se está facturando nada.

Recursos activos

Ve al menú de navegación → Compute Engine, Cloud SQL, Cloud Storage, etc.

Confirma que no haya máquinas virtuales encendidas, bases de datos activas o buckets con datos.

En APIs y servicios, revisa si hay APIs habilitadas que puedan generar consumo (ejemplo: BigQuery, Vision API).

🔹 Estrategia práctica:

Si quieres mantener el proyecto “limpio” y sin sorpresas, lo mejor es deshabilitar todas las APIs y apagar/borrar recursos activos.

Luego, en Billing, puedes incluso desvincular la cuenta de facturación del proyecto. Eso garantiza que aunque alguien intente usarlo, no se generen cargos.

En resumen: Billing te dice si ya estás pagando algo, pero revisar los recursos te asegura que no haya nada que pueda empezar a cobrar en el futuro.