---
id: DEV-318
title: "Verificador de actualizaciones: consulta directa a npm Registry, ajuste de TTL y resiliencia de caché"
status: done
created_date: '2026-10-17'
updated_date: '2026-10-17 17:20'
labels:
  - "cli"
  - "updates"
  - "dx"
  - "npm"
dependencies: []
priority: high
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El sistema de verificación de actualizaciones (`scripts/updateChecker.js`) notificaba versiones desfasadas respecto al comando de instalación sugerido (`npm i -g @gripm/board@latest`), provocando situaciones donde la terminal o la interfaz web reportaban una versión disponible anterior (ej. `v1.3.0 → v1.6.0`) cuando npm instalaba una versión más reciente (ej. `1.6.1`).

### Causa Raíz Identificada:
1. **Desalineación de fuente de verdad:** `updateChecker.js` consultaba exclusivamente la API de GitHub Releases (`api.github.com/repos/.../releases/latest`), sujeta a demoras de marcado, rate limits no autenticados (60 req/h) y divergencias con el registry público de npm donde se distribuye `@gripm/board`.
2. **TTL rígido de caché (24 horas):** La ventana de persistencia en `update-cache.json` (`CACHE_TTL_MS = 24 * 60 * 60 * 1000`) impedía detectar releases publicados durante el mismo día y no se invalidaba al actualizar el paquete localmente.
3. **Condición restrictiva en listeners asíncronos:** En `bin/gripm.js` y `scripts/mcp-server.ts`, el callback de fondo evaluaba `if (res.hasUpdate && !cachedUpdate?.hasUpdate)`, descartando cualquier versión más reciente que la cacheada previamente si `hasUpdate` ya estaba activo.

### Solución Implementada:
- Priorizada la consulta directa a `https://registry.npmjs.org/@gripm/board/latest` (con fallback de resiliencia a GitHub Releases API).
- Reducido el TTL de caché de 24 horas a 4 horas e implementada la invalidación/limpieza automática de `hasUpdate` cuando la versión en ejecución sea mayor o igual a la última conocida.
- `bin/gripm.js` y `scripts/mcp-server.ts` ahora actualizan el aviso si la versión detectada en vivo es mayor que la que estaba en caché (`semverGreaterThan(res.latestVersion, cachedUpdate.latestVersion)`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 AC #1: `checkForUpdates` en `scripts/updateChecker.js` consulta prioritariamente el registry público de npm (`https://registry.npmjs.org/@gripm/board/latest`), extrayendo el campo `version` canónico con fallback a GitHub Releases.
- [x] #2 AC #2: Reducir `CACHE_TTL_MS` a 4 horas e invalidar/actualizar `hasUpdate: false` en `update-cache.json` cuando `currentVersion` sea igual o mayor que `latestVersion`.
- [x] #3 AC #3: `bin/gripm.js` y `scripts/mcp-server.ts` actualizan el banner en vivo si la comprobación asíncrona descubre una versión superior a la que existía en el caché.
- [x] #4 AC #4: Pruebas automatizadas en `scripts/verify-integration.js` validan la consulta simulada, la invalidación de caché y las comparaciones semver.
- [x] #5 AC #5: Pirámide de verificación en verde (`npx tsc --noEmit`, `npm test`, `npm run backlog:check`, `npm run build`).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Mantiene intacta la coexistencia de ejecución de binario global vs desarrollo local en el repo sin emitir advertencias intrusivas.
<!-- SECTION:NOTES:END -->
