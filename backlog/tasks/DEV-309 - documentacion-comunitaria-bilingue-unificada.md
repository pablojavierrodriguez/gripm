---
id: DEV-309
title: "Documentación Comunitaria Bilingüe Unificada: CODE_OF_CONDUCT, CONTRIBUTING y SECURITY"
status: ready
created_date: '2026-10-16'
updated_date: '2026-10-16'
labels:
  - "docs"
  - "community"
  - "i18n"
dependencies: []
priority: medium
type: tech_debt
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Unificación bilingüe en un solo archivo (inglés primero, español debajo) para la documentación comunitaria del repositorio: `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` y `SECURITY.md`.

### Diagnóstico y Justificación:

1. **Evitar dispersión de archivos:** En lugar de mantener archivos separados por idioma (`.es.md` y `.md`) propensos a *drift* y desincronización, cada documento consolida ambas versiones en una única fuente de verdad.
2. **Convención Canónica:** Inglés primero en la mitad superior del documento (visibilidad global / internacional), seguido por la versión completa en español debajo, conectadas por selector de anclajes de navegación rápida en la cabecera.
3. **Preservación total del contenido:** La versión en español preexistente se preserva en su totalidad sin pérdida de rigor técnico ni detalle contextual.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `CODE_OF_CONDUCT.md` unifica en un solo archivo la versión canónica de Contributor Covenant 2.1 en inglés arriba y la versión en español adaptada debajo, con selector de anclaje bilingüe.
- [x] #2 `CONTRIBUTING.md` unifica en un solo archivo la guía de contribución completa en inglés arriba y la versión en español existente debajo, con selector de anclaje bilingüe.
- [x] #3 `SECURITY.md` unifica en un solo archivo la política de seguridad y modelo de amenazas en inglés arriba y la versión en español existente debajo, con selector de anclaje bilingüe.
- [x] #4 La suite de verificación y calidad pasa en verde (`npm run backlog:check`, `npm run backlog:sync`, `node scripts/verify-changes.js`).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Redactar versión en inglés de `CODE_OF_CONDUCT.md` con anclajes bilingües y concatenar con español.
2. Redactar versión en inglés de `CONTRIBUTING.md` con anclajes bilingües y concatenar con español.
3. Redactar versión en inglés de `SECURITY.md` con anclajes bilingües y concatenar con español.
4. Ejecutar pirámide de verificación y sincronización de backlog.
<!-- SECTION:PLAN:END -->
