---
id: DEV-239
title: "Unificación de switches on/off en Settings y erradicación de checkboxes nativos simples"
status: ready
created_date: '2026-10-11'
updated_date: '2026-10-11'
labels:
  - "ux"
  - "settings"
  - "ui"
  - "accessibility"
  - "design-system"
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Al evolucionar la configuración de **Modules & Add-ons** (DEV-220) hacia switches interactivos on/off, se produjo una inconsistencia de UX en el resto de los paneles de configuración de `SettingsView.tsx`. Los controles booleanos en **Workflows & Views**, **Tablero Kanban** y **Apariencia** permanecieron implementados con `<input type="checkbox">` nativos del navegador, creando una experiencia fragmentada, poco ergonómica y visualmente heterogénea.

### Objetivos y Solución

1. **Componente Reutilizable y Accesible `SettingsSwitch`:**
   - Crear un componente `SettingsSwitch` en `src/components/SettingsView.tsx` estilizado con el design system canónico de Gripm.
   - Pista con esquinas redondeadas (`w-11 h-6`), botón deslizante con sombra sutil (`h-5 w-5 shadow-xs`) y transición suave (`transition-all duration-200`).
   - Micro-interacción táctil (`active:scale-95`).
   - Accesibilidad con foco visible de alto contraste (`peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2`) y soporte `aria-label`.
   - Contenedor `span` para evitar anidamiento prohibido de `<label>` en tarjetas que ya son clickeables.

2. **Reemplazo Integral en Todas las Pestañas Afectadas:**
   - **Workflows & Views (`views`):** Reemplazar los 3 checkboxes nativos de pestañas visibles (`enabledTabs.kanban`, `enabledTabs.sprint`, `enabledTabs.release`).
   - **Tablero Kanban (`kanban`):** Reemplazar los 2 checkboxes nativos de configuración (`showIdeasByDefault`, `showDoneHistoryByDefault`).
   - **Apariencia (`visual`):** Reemplazar los 2 checkboxes nativos de preferencias (`autoSave`, `rankingEnabled`).
   - **Modules & Add-ons (`modules`):** Unificar los 3 switches existentes (`sprint`, `release`, `modeState === 'multi'`) usando también `SettingsSwitch` para eliminar código duplicado.

3. **Pruebas y Verificación:**
   - Validar estáticamente y unitariamente en tests que no queden checkboxes nativos simples en `SettingsView.tsx`.
   - Validar la accesibilidad y ergonomía con `npm run audit:ux` y la suite de pruebas completa `npm test`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Crear componente SettingsSwitch reutilizable, accesible (teclado + aria-label) y consistente en SettingsView.tsx
- [x] #2 Reemplazar checkboxes simples en Workflows & Views (kanban, sprint, release) por SettingsSwitch
- [x] #3 Reemplazar checkboxes simples en Tablero Kanban (showIdeasByDefault, showDoneHistoryByDefault) por SettingsSwitch
- [x] #4 Reemplazar checkboxes simples en Apariencia (autoSave, rankingEnabled) por SettingsSwitch
- [x] #5 Unificar los switches de Modules & Add-ons bajo el componente SettingsSwitch sin duplicación de markup
- [x] #6 Zero errores de tipos (npx tsc --noEmit) y cero checkboxes nativos residuales en SettingsView.tsx
- [x] #7 Suite de pruebas completa (npm test) y auditoría UX (npm run audit:ux) en verde sin regresiones
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Erradicación completa: Ningún control de configuración booleana en SettingsView utiliza input checkbox con estilo nativo cuadrado.
- Ergonomía táctil: Las tarjetas y los switches cuentan con targets de interacción cómodos y micro-feedback al presionar.
<!-- SECTION:NOTES:END -->
