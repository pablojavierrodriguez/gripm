---
id: DEV-363
title: "Descomposicion modular de backend y servicios (backlogService.ts y api.ts bajo 1000 LOC)"
status: ready
created_date: '2026-11-02'
updated_date: '2026-11-02'
labels:
  - "refactor"
  - "architecture"
  - "modularity"
  - "backend"
  - "clean-code"
dependencies: []
priority: high
type: refactor
estimate: 8
claimed_by: "antigravity:subagent-dev-363"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
El diagnóstico estático del propio repositorio (`audit-engine.mjs`) expone que el backend de `@gripm/board` incumple severamente la regla de modularidad (< 1000 LOC) y separación de responsabilidades:
- `server/services/backlogService.ts` tiene **2.622 líneas**, actuando como un God-File que acopla resolución de rutas, validación de seguridad de comandos (`validateVerifyCommand`), lectura/escritura de tareas en Markdown y JSON, motor de sincronización de `BACKLOG.md`, gestión de sprints/releases/retros y cálculo de métricas.
- `server/routes/api.ts` tiene **1.246 líneas**, concentrando todos los endpoints HTTP en un único controlador monolítico.
- `server/services/auditService.ts` contiene una evasión de tipos `as unknown as RepoHealthReport` en la línea 86.
- `scripts/backlogMdParser.ts` (1.157 líneas) y `scripts/mcp-server.ts` (1.074 líneas) también superan el techo de 1000 líneas.

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  1. Descomponer `server/services/backlogService.ts` en módulos cohesivos (< 700 LOC cada uno) bajo `server/services/backlog/`:
     - `gatekeeperSecurity.ts`: Validación y ejecución segura de `verifyCommand` y Gatekeeper (`validateVerifyCommand`, `runGatekeeperCheck`).
     - `backlogSyncEngine.ts`: Reconciliación, validación de slugs/ACs y generación de `BACKLOG.md` (`syncBacklog`, `exportBacklog`).
     - `backlogCycles.ts`: Gestión de Sprints, Releases y Retrospectivas (`sprints.json`, `releases.json`, `retrospectives.json`).
     - `backlogStats.ts`: Cálculo de métricas y estadísticas agregadas.
     - `backlogService.ts`: Fachada limpia y operaciones CRUD de tareas (< 800 LOC), preservando todos los exports públicos para no romper consumidores ni tests.
  2. Descomponer `server/routes/api.ts` extrayendo sub-routers por dominio (`server/routes/tasksRoutes.ts`, `server/routes/cyclesRoutes.ts`, `server/routes/projectsRoutes.ts`), dejando `api.ts` < 600 LOC.
  3. Modularizar las secciones auxiliares de `scripts/backlogMdParser.ts` y los schemas de tools de `scripts/mcp-server.ts` para que ambos bajen de 1000 LOC.
  4. Eliminar el cast `as unknown as` en `server/services/auditService.ts` tipando adecuadamente el contrato de retorno.
- **Out-of-Scope:**
  - Cambiar contratos de endpoints REST o esquemas JSON de respuestas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `server/services/backlogService.ts`, `server/routes/api.ts`, `scripts/backlogMdParser.ts`, `scripts/mcp-server.ts` y todos los nuevos submódulos creados tienen estrictamente **menos de 1000 líneas de código** (rango objetivo: 200 - 750 LOC).
- [x] #2 Todos los exports públicos de `server/services/backlogService.ts` y `scripts/backlogMdParser.ts` se mantienen 100% compatibles sin romper importadores existentes.
- [x] #3 `server/services/auditService.ts` no contiene `as unknown as` ni ninguna evasión de tipos prohibida por `anti-slop.mjs`.
- [x] #4 `npm run build` regenera limpiamente los 4 binarios en `bin/` (`gripm.js`, `gripm-mcp.js`, `server.js`, `gripm-cli.js`).
- [x] #5 La Pirámide de Verificación completa (`npx tsc --noEmit`, `npm test`, `npm run publish:check`, `node scripts/verify-changes.js --all`) pasa con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extraer de `server/services/backlogService.ts` los módulos `gatekeeperSecurity.ts`, `backlogSyncEngine.ts`, `backlogCycles.ts` y `backlogStats.ts`, re-exportando desde `backlogService.ts`.
2. Extraer de `server/routes/api.ts` los manejadores de ciclos (sprints/releases/retros) y proyectos/importación a módulos dedicados en `server/routes/`.
3. Extraer las definiciones estáticas de esquemas MCP (`CANONICAL_TOOLS`) de `scripts/mcp-server.ts` y los helpers de bloques de código/secciones de `scripts/backlogMdParser.ts`.
4. Corregir el tipado en `server/services/auditService.ts` sin `as unknown as`.
5. Recompilar binarios (`npm run build`) y correr `npm test`.
<!-- SECTION:PLAN:END -->
