---
id: DEV-157
title: "Integracion de Logo y Splash en Pantalla de Carga y Unificacion de Favicon"
status: done
created_date: '2026-10-04'
updated_date: '2026-10-04'
labels:
  - "ui"
  - "branding"
  - "ux"
  - "frontend"
dependencies: []
priority: high
type: feature
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La aplicación presenta dos inconsistencias visuales y de branding:
1. El favicon vectorial `public/favicon.svg` conserva un isotipo de dos barras horizontales heredado del prototipo anterior a gripm, que los navegadores modernos priorizan sobre `public/favicon.png`.
2. La carga inicial de la aplicación muestra una pantalla en blanco antes de montar React (`<div id="root"></div>` vacío en `index.html`), y una vez montado React, se muestra un spinner genérico circular sin el logo ni la identidad de gripm en `src/App.tsx`.

Esta tarea unifica la identidad visual en todos los puntos de entrada:
- Actualización de `public/favicon.svg` y configuración de meta tags en `index.html` para mostrar la "G" oficial de gripm.
- Splash screen instantáneo (0ms) en `index.html` con CSS inline ligero y anti-flash.
- Pantalla de carga en `src/App.tsx` con el isotipo de gripm, halo/anillo orbital y estado tipográfico sobrio.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Unificar favicon en public/favicon.svg reflejando el logo oficial 'G' de gripm y actualizar meta tags en index.html
- [x] #2 Incorporar splash screen instantaneo (0ms) en index.html dentro de #root con logo centrado, soporte anti-flash y cero CLS
- [x] #3 Implementar pantalla de carga estilizada en App.tsx con logo oficial de gripm, animacion orbital/halo y mensaje de estado
- [x] #4 Superar la piramide de verificacion (tsc, npm test, backlog:check, build) sin interferir con cambios de otros agentes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear vector SVG de alta fidelidad para `public/favicon.svg` y ajustar `index.html` con `<link rel="apple-touch-icon" ...>` y referencias limpias.
2. Inyectar en `index.html` dentro de `<div id="root">` un splash HTML estático con el logo de gripm y animación CSS inline suave.
3. Actualizar el bloque de carga de `src/App.tsx` respetando las líneas circundantes sin alterar modificaciones de otros agentes.
4. Ejecutar sincronización de backlog y verificar toda la pirámide de calidad.
<!-- SECTION:PLAN:END -->

## Technical Notes

<!-- SECTION:NOTES:BEGIN -->
- El contenido dentro de `<div id="root">` en `index.html` es reemplazado de manera transparente por `createRoot(root).render(...)` en cuanto React monta.
- Para evitar FOUC y respetar la preferencia del usuario, los colores de fondo y acento del splash HTML usan el tema detectado en el script anti-flash de `index.html`.
<!-- SECTION:NOTES:END -->
