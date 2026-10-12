---
id: DEV-257
title: "Pie de marca y enlaces de valor real en el modal de atajos de teclado (0 px de costo en el tablero)"
status: ready
created_date: '2026-10-12'
updated_date: '2026-10-12'
labels:
  - "ux"
  - "branding"
  - "i18n"
  - "accessibility"
dependencies:
  - DEV-254
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El proyecto **no** lleva footer en el lienzo de trabajo: el tablero Kanban necesita el 100 % del alto disponible, la barra inferior móvil ya ocupa la zona táctil crítica y un footer tradicional es un anti-patrón de UX en un cockpit local. Pero la marca (versión) y los enlaces de soporte (repositorio, documentación, reporte de bug) siguen sin ningún lugar natural donde vivir.

Decisión de diseño (sesión Antigravity `4252e537-78f4-4e59-bf91-6290a45fec59`, "Opción 1"): alojar el pie en el diálogo de ayuda de atajos (`KeyboardShortcutsModal`, tecla `?`), que es un modal de **0 % de recurrencia** — abrirlo ya implica que el usuario busca información — y por lo tanto no compite jamás con el flujo de trabajo.

Alcance:
1. Línea de pie hiper discreta dentro de `KeyboardShortcutsModal`: `gripm v<versión>` + enlaces `GitHub`, `Documentación` y `Reportar bug`, en micro-tipografía `text-[11px]`, con separación por `gap` (sin caracteres separadores que se rompan al envolver) y sin iconografía que añada ruido.
2. La versión se toma de `updateAvailable.currentVersion` ya disponible en `boardData`; si el backend no la reporta, el modal degrada a la marca simple `gripm` sin romperse.
3. El grupo de enlaces es un `<nav>` etiquetado por `aria-label`, abre en pestaña nueva con `rel="noreferrer noopener"` y anuncia `(se abre en una pestaña nueva)` en `sr-only`.
4. Área táctil mínima de 44 px por enlace (`min-h-[44px]`) y `flex-wrap` para que en móvil la fila envuelva sin desbordar.
5. Sin costo visual en el tablero: el footer vive únicamente dentro del modal.

Fuera de alcance: bloque "Acerca de" en `SettingsView` (Opción 2, descartada por ahora) y cualquier footer en la aplicación principal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `KeyboardShortcutsModal` renderiza en su pie un `<nav aria-label>` con la marca `gripm` y, si existe, el sufijo `v<currentVersion>`
- [x] #2 Los tres enlaces (repositorio, documentación y reporte de bug) abren en pestaña nueva con `rel="noreferrer noopener"` y texto visible traducible
- [x] #3 Cada enlace tiene área táctil de al menos 44 px de alto y el contenedor usa `flex-wrap` sin desbordamiento en anchos móviles
- [x] #4 Cada enlace incluye un `sr-only` que anuncia `(se abre en una pestaña nueva)` en español e inglés
- [x] #5 `src/locales/es.json` y `src/locales/en.json` exponen todas las claves nuevas del pie y `KeyboardShortcutsModal` compila sin claves faltantes
- [x] #6 `npx tsc --noEmit` reporta 0 errores
- [x] #7 Pirámide de verificación en verde: `npm test` (16 pasos, 20.2s), `npm run audit:ux` (0 findings nuevos en UX-011), `npm run backlog:sync` && `npm run backlog:check`, `npm run publish:check`, `npm run test:ui`, `npm run build` y `node scripts/verify-changes.js --all` (413 archivos)
<!-- SECTION:DESCRIPTION:END -->