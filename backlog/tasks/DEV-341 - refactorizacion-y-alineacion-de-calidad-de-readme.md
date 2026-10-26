---
id: DEV-341
title: "Refactorizacion y alineacion de calidad de README.md y README.es.md con buenas practicas modernas"
status: ready
created_date: '2026-10-26'
updated_date: '2026-10-26'
labels:
  - "documentation"
  - "dx"
  - "mcp"
  - "onboarding"
dependencies: []
priority: high
type: feature
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactorización integral de la documentación principal (`README.md` y `README.es.md`) para alinearla con las mejores prácticas de herramientas de desarrollo modernas (DevTools, CLI y AI-pair programming):

1. **Corrección de discrepancias técnicas contra el código real**:
   - Eliminar afirmaciones incorrectas sobre `gripm --init` (que prometía instalar `backlog:check`, `backlog:sync` y hooks pre-commit en repositorios de consumidores, cuando en realidad solo configura los scripts `"board"` y `"mcp"`).
   - Eliminar la exposición de scripts de desarrollo interno del repositorio (`npm run backlog:check`, `npm run audit:ux`) presentados erróneamente como comandos de usuario de `@gripm/board`.
   - Documentar el subcomando existente de importación universal (`gripm import --file <ruta>` para Jira, Linear y CSV).
   - Documentar la totalidad de comandos y flags reales del CLI en una tabla canónica accesible para usuarios finales (incluyendo `gripm add`, `--port`, `--repo`, `--no-open`, `--host 0.0.0.0` y modo `--hub`).

2. **Excelencia editorial, marketing y sobriedad técnica**:
   - Eliminar la sobrecarga de emojis en cada encabezado H2 (sustituyendo la estética de plantilla por tipografía limpia y sobria).
   - Reorganizar la narrativa bajo el principio de Divulgación Progresiva: Hero con propuesta de valor clara -> Why Gripm (comparativa local-first + MCP) -> Quickstart en 3 pasos -> Integración con Agentes de IA (MCP) -> Vistas del producto -> Referencia de CLI y almacenamiento -> Ecosistema (`@gripm/playbook`) y Contribución en bloques `<details>`.
   - Limpiar advertencias defensivas y trasladar guías de privacidad y desinstalación a bloques de referencia.
   - Paridad estricta y bilingüe entre `README.md` (English) y `README.es.md` (Español).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `README.md` y `README.es.md` reflejan con exactitud técnica las opciones y comportamiento real de `gripm --init` según `scripts/initScaffold.js`.
- [x] #2 Los scripts de desarrollo interno del repositorio quedan separados de la guía de usuario y no se presentan como comandos del paquete `@gripm/board`.
- [x] #3 Se documenta el comando `gripm import` y las opciones completas del CLI en una tabla estructurada para usuarios finales.
- [x] #4 Los 12 encabezados H2 adoptan una jerarquía tipográfica limpia y sobria sin prefijos de emojis artificiales en cada título.
- [x] #5 La integración con agentes de IA y el servidor MCP documenta el snippet JSON y la compuerta de calidad de forma concisa con tabla de herramientas en `<details>`.
- [x] #6 El Hero incluye badges estándar (npm version, Node >= 20, MCP Ready, License, Live Demo) y enlace directo a `gripm.vercel.app`.
- [x] #7 Paridad total de contenido y estructura entre `README.md` (inglés) y `README.es.md` (español), respetando la regla Anti-Em-Dash.
- [x] #8 La suite de verificación (`npm test` y `npm run backlog:check`) aprueba con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear tarea DEV-341 en `backlog/tasks/` y sincronizar backlog con `npm run backlog:sync`.
2. Redactar el nuevo `README.md` en inglés con la estructura optimizada (~220-250 líneas), rigurosa, profesional y sin inexactitudes.
3. Redactar el nuevo `README.es.md` en español con paridad total de secciones y estilo sobrio.
4. Ejecutar validaciones del repositorio (`npm run backlog:check`, `npm run publish:check`, `node scripts/verify-changes.js`).
5. Verificar criterios de aceptación y avanzar tarea a `review`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reducción neta de ~500 líneas a ~260 líneas en cada archivo con divulgación progresiva.
- Suite unificada completa aprobada (26 pasos secuenciales, código 0).
<!-- SECTION:NOTES:END -->
