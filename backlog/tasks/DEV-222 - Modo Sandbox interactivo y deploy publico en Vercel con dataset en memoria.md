---
id: DEV-222
title: "Modo Sandbox interactivo y deploy público en Vercel con dataset en memoria"
status: draft
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "web"
  - "demo"
  - "vercel"
  - "sandbox"
  - "ui"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Preparar una versión web autónoma de Gripm Board para desplegar en Vercel, orientada a demostraciones públicas desde dispositivos móviles y comunidades técnicas sin requerir un CLI ni daemon local:
1. **Detección automática de entorno y fallback en memoria:** Si la aplicación detecta que está corriendo en la web sin conexión al socket o CLI local, inicializa automáticamente un adaptador en memoria y LocalStorage con un dataset precargado (un sprint activo, tareas en distintas columnas, criterios de aceptación interactivos y un release publicado con changelog) sin mostrar pantallas vacías ni errores de red.
2. **Selector de formato dual interactivo:** Incorporar en la tarjeta o modal de tarea un selector que permita previsualizar en vivo cómo se serializa esa tarea en Markdown (`backlog/tasks/*.md`) frente a JSON unificado (`.gripm/backlog.json`).
3. **Optimización móvil estricta (Zero-CLS & Touch Targets):** Interfaz completamente adaptada a pantallas móviles (360px a 430px) con áreas táctiles de al menos 44px de altura/anchura y navegación táctil fluida.
4. **Configuración de hosting SPA:** Configuración limpia de `vercel.json` para soportar rutas SPA sin errores 404 en navegación directa o recarga.
5. **Enlace a demo en README:** Incorporar badge y enlace directo a la demo en producción en la cabecera de `README.md` y `README.es.md`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Compilacion de produccion con Vite limpia hacia Vercel con configuracion de vercel.json para soportar rutas SPA
- [ ] #2 Deteccion automatica de entorno sin daemon que monta de inmediato dataset de prueba en memoria sin errores de red
- [ ] #3 Interfaz adaptada a pantallas moviles de 360px a 430px con areas tactiles accesibles de al menos 44px
- [ ] #4 Selector en tarjeta o modal para inspeccionar el formato dual Markdown con frontmatter vs JSON unificado
- [ ] #5 Enlace directo a la demo en produccion incorporado en la cabecera del README.md
- [ ] #6 npm test y npm run backlog:check pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Mantener la premisa local-first: el deploy en Vercel es una sandbox interactiva de demostración, no un servicio SaaS remoto.
<!-- SECTION:NOTES:END -->
