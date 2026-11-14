---
id: DEV-365
title: "Certificacion de Health Score >= 95/100 en Gripm Board y saneamiento del baseline UX"
status: draft
created_date: '2026-11-02'
updated_date: '2026-11-02'
labels:
  - "quality"
  - "ux"
  - "a11y"
  - "dogfooding"
dependencies:
  - DEV-360
  - DEV-363
  - DEV-364
priority: medium
type: refactor
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
Una vez eliminados los scripts duplicados (`DEV-360`) y descompuestos los God-Files de backend (`DEV-363`) y frontend (`DEV-364`), quedan dos deudas para que el repositorio `@gripm/board` sea un ejemplo impecable de dogfooding de su propio framework:
1. Dos archivos de pruebas (`scripts/verify-integration.js` con 1.091 LOC y `scripts/test-parser-roundtrip.js` con 1.049 LOC) superan las 1000 líneas, más un marcador `BUG` en `scripts/import-docs.js:231` que penaliza el Health Score.
2. El archivo `.gripm/audit-ux-baseline.json` acumula **205 observaciones silenciadas** (muchas de ellas `INFO` estilísticas como `UX-012` o `WARNING` reales de `UX-009` / `UX-010` en componentes que ahora estarán modularizados).

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  1. Modularizar o particionar `scripts/verify-integration.js` y `scripts/test-parser-roundtrip.js` bajo 1000 LOC, y resolver/limpiar el marcador `BUG` pendiente en `scripts/import-docs.js`.
  2. Remediar en los componentes de `src/components/` las advertencias reales de accesibilidad y ergonomía táctil (`UX-009` touch targets, `UX-010` `aria-label` en botones de ícono) y regenerar `.gripm/audit-ux-baseline.json` reduciendo drásticamente las observaciones heredadas.
  3. Certificar que `npm run audit:repo -- --strict` sobre la raíz de `@gripm/board` arroje **0 violaciones de LOC, 0 supresiones y un Health Score >= 95/100**.
- **Out-of-Scope:**
  - Rediseño estético de pantallas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Ningún archivo escaneado en todo el repositorio `@gripm/board` (`src/`, `server/`, `scripts/`) alcanza o supera las 1000 líneas de código (`0` violaciones en `check-loc --strict`).
- [ ] #2 El comando de diagnóstico de salud del repositorio (`audit-engine`) sobre `@gripm/board` reporta un **Health Score >= 95/100** con 0 errores de LOC y 0 supresiones.
- [ ] #3 Se corrigen las advertencias reales `ERROR`/`WARNING` (`UX-009`, `UX-010`) en `src/components/` y se actualiza `.gripm/audit-ux-baseline.json` sin observaciones huérfanas.
- [ ] #4 La Pirámide de Verificación completa (`npx tsc --noEmit`, `npm test`, `npm run test:ui`, `npm run publish:check`, `node scripts/verify-changes.js --all`) pasa con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Particionar `scripts/verify-integration.js` y `scripts/test-parser-roundtrip.js` (< 800 LOC) y sanear `scripts/import-docs.js`.
2. Corregir hallazgos de accesibilidad/touch targets en `src/components/` y actualizar `.gripm/audit-ux-baseline.json`.
3. Verificar que `audit-engine` reporte Health Score >= 95/100 y ejecutar la Pirámide de Verificación completa.
<!-- SECTION:PLAN:END -->
