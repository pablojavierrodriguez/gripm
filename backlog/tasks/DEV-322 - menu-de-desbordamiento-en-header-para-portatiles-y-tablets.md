---
id: DEV-322
title: "Menú de desbordamiento en Header para portátiles y tablets (botón Nueva Tarea fuera de pantalla en 1366x768)"
status: done
claimed_by: "antigravity:eac4e0fc"
created_date: '2026-10-19'
updated_date: '2026-10-19 18:15'
labels:
  - "ux"
  - "ui"
  - "responsive"
  - "header"
dependencies: []
priority: high
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En `1366x768` el botón `+ Nueva Tarea` del `Header` quedaba fuera del viewport tras v1.8.0 (se sumó el botón de Command Palette). Entre `768px` y `1535px` se agrupan las acciones secundarias (Command Palette, atajos, idioma, tema y Papelera con contador) en un popover `⋯` ("Más acciones"). Desde `1536px` (2xl) el header conserva todos los botones sueltos. Por debajo de `768px` se mantiene el drawer hamburguesa, que ahora incluye la Papelera.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 En `1366x768` el botón `+ Nueva Tarea` es visible y las acciones secundarias están agrupadas en el popover `⋯` (validado manualmente por el PO con `npm run dev`)
- [x] #2 Desde `1536px` el header conserva todos los botones sueltos sin cambios visuales
- [x] #3 El popover se cierra con `Escape` y con clic exterior, y la clave i18n `header.moreActions` existe en `es.json` y `en.json`
- [x] #4 El drawer móvil incluye la entrada Papelera
- [x] #5 `npx tsc --noEmit` y `npm test` (21 pasos) pasan con código 0
<!-- AC:END -->
