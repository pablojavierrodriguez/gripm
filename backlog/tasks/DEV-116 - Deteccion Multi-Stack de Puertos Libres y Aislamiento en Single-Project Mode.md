---
id: DEV-116
title: "Detección Multi-Stack de Puertos Libres y Aislamiento de Origen en Single-Project Mode"
status: done
created_date: '2026-09-26'
updated_date: '2026-10-02 23:43'
labels:
  - "server"
  - "networking"
  - "cli"
  - "single-project"
dependencies: []
priority: high
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
order: "30"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Corregir la colisión de puertos ("sockets fantasma") y secuestro de tráfico HTTP cuando coexisten múltiples instancias de DevBoard en modo Single-Project (ej. `instancia-b` en `[::1]:4100` y `dev-board` en `*:4100`).

**Problema Identificado:**
1. En macOS Darwin, un proceso que enlaza `host: 'localhost'` (`[::1]:4100`) y otro que enlaza `host: true` (`*:4100`) coexisten en el kernel sin arrojar `EADDRINUSE`.
2. Vite con `strictPort: false` no detecta que el puerto 4100 está tomado y no salta a 4101.
3. El navegador resuelve `localhost` por IPv6 y entrega todo el tráfico a la otra instancia (`instancia-b`).
4. Al compartir origen (`localhost:4100`), `localStorage` (`devboard_active_project_id`) contamina el proyecto activo y sobreescribe `~/.devboard/registry.json`.

**Solución Técnica:**
- Detección proactiva multi-stack (IPv4 `127.0.0.1` + IPv6 `::1`) para hallar el primer puerto libre (4100, 4101, 4102...).
- Unificar `host: 'localhost'` por defecto en `vite.config.ts` y `bin/devboard.js`.
- Blindar `src/App.tsx` en `singleProject: true` para ignorar `localStorage` residual de otros proyectos y no disparar `setActiveProjectApi` prematuramente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 AC1: Implementar función de detección multi-stack `isPortAvailable(port)` que verifique conexión y bind en `127.0.0.1` y `::1`.
- [x] #2 AC2: Resolver automáticamente el puerto disponible (4100 -> 4101 -> ...) en `vite.config.ts` y `bin/devboard.js` ante puertos ocupados.
- [x] #3 AC3: Reemplazar `host: true` por `host: 'localhost'` (respetando `--host` o `DEVBOARD_HOST`) en `vite.config.ts`.
- [x] #4 AC4: Bloquear `selectedProjectId` en `src/App.tsx` cuando `boardData.singleProject` es `true`, previniendo sobreescritura de `activeProjectId` en `registry.json`.
- [x] #5 AC5: Eliminar el proceso duplicado/colgado actual de `dev-board` (PID 51522).
- [x] #6 AC6: Verificar tipado estricto (`npx tsc --noEmit`), suite de pruebas (`npm test`) y sincronización de backlog (`npm run backlog:check`).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Matar el proceso huérfano PID 51522 que quedó colgado en `*:4100`.
2. Crear utilidad `findAvailablePort(startPort, host)` en `scripts/portUtils.js` con chequeo multi-stack (IPv4 y IPv6).
3. Integrar la búsqueda dinámica de puerto en `vite.config.ts` y alinear `server.host` a `'localhost'` (o variable `DEVBOARD_HOST`).
4. Integrar la búsqueda dinámica de puerto en `bin/devboard.js`.
5. Ajustar `src/App.tsx` para que en modo mono-proyecto (`singleProject`) no invoque `setActiveProjectApi` con valores de `localStorage`.
6. Ejecutar suite de pruebas y linters (`tsc`, `test`, `backlog:check`).
<!-- SECTION:PLAN:END -->
