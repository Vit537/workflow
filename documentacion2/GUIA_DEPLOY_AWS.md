# Guía de Despliegue en AWS — Backend (Spring Boot)

> **Objetivo:** Dejar el backend funcionando en AWS y probarlo con Postman.  
> **Lo que ya funciona:** GitHub Actions construye la imagen Docker y la sube a ECR automáticamente en cada push.  
> **Lo que falta:** Configurar los secretos, crear la Task Definition y crear el Service en ECS.

---

## Estado actual ✓

```
git push  →  GitHub Actions  →  imagen subida a ECR  ✓
                                     │
                                     ▼
                              ECS necesita: Task Definition + Service  ← estamos aquí
```

---

## PASO 1 — Agregar la dependencia Actuator al backend

El ALB necesita un endpoint de health check para saber si el contenedor está vivo.  
Spring Boot Actuator provee `/actuator/health` automáticamente.

