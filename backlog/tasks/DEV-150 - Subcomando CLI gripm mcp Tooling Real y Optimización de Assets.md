---
id: DEV-150
title: "Subcomando CLI gripm mcp, Tooling Real de Calidad y Optimización de Assets"
status: done
created_date: '2026-10-03'
updated_date: '2026-10-03 19:48'
labels:
  - "cli"
  - "tooling"
  - "assets"
  - "quality"
dependencies: []
priority: high
type: feature
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Pulido y robustecimiento de ergonomía de adopción y estándares de desarrollo:
1. **Subcomando CLI `gripm mcp`:** En `bin/gripm.js`, si el primer argumento es `mcp`, derivar inmediatamente al servidor MCP (`bin/gripm-mcp.js`), permitiendo la sintaxis documentada en el README `npx gripm mcp`.
2. **Descripciones MCP en Inglés:** Proporcionar descripciones en inglés para las herramientas MCP en `scripts/mcp-server.ts`, asegurando una comprensión óptima por LLMs y agentes de usuarios internacionales.
3. **Tooling Real (ESLint / Prettier / Backlog Check):**
   - Eliminar el bypass silencioso `|| echo '...'` en los scripts de linting y formateo.
   - Instalar dependencias reales de ESLint y Prettier o documentar los comandos correspondientes.
   - Ajustar `backlog:check` para que sea de solo lectura en CI y falle si hay diferencias en lugar de reescribir `BACKLOG.md` silenciosamente.
4. **Optimización de Assets:** Generar favicon SVG o PNG optimizado (~5 KB) en reemplazo del PNG de 462 KB actual.
5. **Higiene de Datos:** Limpiar tareas de prueba en `backlog/archive/` (`dev--028`, `dev--029`, `dev--065`) y sanitizar referencias residuales privadas en scripts y tests.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `node bin/gripm.js mcp` ejecuta el servidor MCP en stdio en lugar de abrir el navegador
- [x] #2 Las herramientas MCP en `scripts/mcp-server.ts` presentan descripciones claras en inglés para agentes IA
- [x] #3 `npm run lint` y `npm run format` cuentan con tooling operativo real o scripts coherentes sin mensajes falsos
- [x] #4 `npm run backlog:check` opera en modo estricto de solo lectura para CI
- [x] #5 Favicon optimizado a tamaño liviano (< 20 KB)
- [x] #6 Limpieza de tareas de prueba en archive y sanitización de cadenas residuales
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Implementar chequeo de `args[0] === 'mcp'` en `bin/gripm.js` para invocar `bin/gripm-mcp.js`.
2. Actualizar descripciones de herramientas MCP al inglés.
3. Instalar eslint/prettier o configurar scripts transparentes.
4. Agregar flag `--read-only` a `scripts/verify-backlog-sync.js`.
5. Reemplazar favicon con versión optimizada.
6. Limpiar archivos residuales en archive y tests.
<!-- SECTION:PLAN:END -->
