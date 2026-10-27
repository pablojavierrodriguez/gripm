---
id: DEV-346
title: "Documentacion de Arquitectura Bilingue Unificada: ARCHITECTURE.md"
status: ready
created_date: '2026-10-27'
updated_date: '2026-10-27 11:17'
labels:
  - "documentation"
  - "architecture"
  - "governance"
dependencies: []
priority: medium
type: tech_debt
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Unificación bilingüe en un solo archivo (inglés primero, español debajo) para la documentación técnica de arquitectura (`docs/ARCHITECTURE.md`), alineándola con el estándar de documentación comunitaria y técnica de gripm (DEV-309 / Gotcha 24 en `AGENTS.md`) y actualizando el inventario de componentes y servicios al estado del arte v1.10.0.

### Diagnóstico y Justificación:

1. **Alineación con el Estándar de Documentación (DEV-309):** `docs/ARCHITECTURE.md` quedó redactado únicamente en español tras DEV-306, mientras que las reglas de gobernanza del repositorio (`AGENTS.md` y `gripm-playbook/AGENTS.md`) estipulan inglés como idioma técnico primario y unificación bilingüe en un solo archivo con anclajes rápidos en cabecera (`🌐 [English](#gripm-system-architecture) | [Español](#arquitectura-del-sistema-gripm)`).
2. **Actualización Arquitectónica v1.10.0:** Incorporar componentes y subsistemas introducidos recientemente: vistas lazy-loaded (`TimelineView`, `MetricsView`, `ImportWizardModal`), servicios de persistencia y caché de concurrencia optimista (`taskCache.ts`, `atomicWrite.ts`), middleware de seguridad (`server/middleware/security.ts`), y onboarding de suite con presets en el CLI (`gripm init`).
3. **Guardrail Anti-Em-Dash:** Cumplimiento estricto de la regla 25 sin uso de guiones largos artificiales (em-dash o en-dash).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `docs/ARCHITECTURE.md` unifica en un solo archivo la versión canónica en inglés arriba y la versión en español adaptada y actualizada debajo, con selector de anclaje bilingüe.
- [x] #2 Ambas versiones documentan con precisión la topología actual v1.10.0: UI modular y code-splitting (`TimelineView`, `MetricsView`), servicios de backend (`taskCache`, `atomicWrite`, `server/middleware/security.ts`) y runtime dual (Daemon local vs Sandbox Vercel).
- [x] #3 Se respeta la regla Anti-Em-Dash (uso exclusivo de guión estándar `-` con espacios).
- [x] #4 La suite de verificación y calidad pasa en verde (`npm run backlog:check`, `npm run backlog:sync`, `node scripts/verify-changes.js --all`).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Traducir y estructurar la versión completa en inglés en la primera mitad de `docs/ARCHITECTURE.md` con su selector de idioma.
2. Actualizar y refinar la versión en español en la segunda mitad para garantizar paridad de contenido 1:1.
3. Actualizar el inventario de componentes (TimelineView, MetricsView, taskCache, atomicWrite, middleware de seguridad) y diagramas en ambas versiones.
4. Ejecutar sincronización de backlog y verificar checks de calidad (`verify-changes.js --all`).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `docs/ARCHITECTURE.md` se unificó en formato bilingüe bajo DEV-309 con navegación rápida bidireccional (`🌐 [English](#gripm-system-architecture) | [Español](#arquitectura-del-sistema-gripm)`).
- Se sincronizaron las tablas de Frontend modular (< 500 LOC) y Backend incorporando `TimelineView`, `MetricsView`, `ImportWizardModal`, `taskCache.ts`, `atomicWrite.ts` y corrigiendo la ruta del middleware de loopback a `server/middleware/security.ts`.
- Validada la regla Anti-Em-Dash y la suite completa de verificación documental.
<!-- SECTION:NOTES:END -->
