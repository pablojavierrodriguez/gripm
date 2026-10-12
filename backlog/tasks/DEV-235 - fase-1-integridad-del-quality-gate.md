---
id: DEV-235
title: "Fase 1: Integridad del Quality Gate y Verificación Multiplataforma"
status: done
created_date: '2026-10-10'
updated_date: '2026-10-10'
labels:
  - "audit"
  - "quality-gate"
  - "ci"
  - "multiplatform"
  - "p1"
dependencies:
  - "DEV-233"
parent: "DEV-233"
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementación de la Fase 1 del plan de remediación de la auditoría técnica integral (DEV-233):
Restaurar la integridad, reproducibilidad y carácter multiplataforma del Quality Gate en CI y local.

### Problemas abordados

1. **GATE-03 / GATE-04:** En Windows, las observaciones del baseline de UX fallaban la coincidencia debido al uso de backslashes (`\`) en `path.relative()`, provocando que el verificador omitiera silenciosamente las aserciones de delta con un aviso. Se incorpora `toPosixPath()` en `audit-ux-code.cjs` y se remueve el bypass en `verify-audit-ux-baseline.js`.
2. **GATE-05:** Erradicación de tres bloques `catch {}` mudos en `verify-backlog-sync.js` (reglas de documentación, integridad de `releases.json` e integridad de `sprints.json`), asegurando que cualquier fallo o corrupción de datos reporte error y bloquee el commit.
3. **GATE-06 / GATE-17:** En `mcp-server.ts`, registro explícito de fallos en mutaciones en lote (`bulk_update`) en lugar de responder falsos `ok: true`, y unificación del estado objetivo de completitud a `status: ready` canónico en lugar de `Done` en mayúscula.
4. **GATE-10:** Inclusión del flag `--ignore-scripts` al invocar `npm pack` en `verify-publish-surface.js`, impidiendo la mutación de `core.hooksPath` en `.git/config` durante la auditoría de empaquetado.
5. **GATE-11:** Envolvimiento de creación de fixtures temporales en bloques `try / finally` y suscripción a eventos de salida del proceso (`process.on('exit')`, `SIGINT`) en `verify-mcp-binary.js` y `verify-resilience-and-cli.js`.
6. **GATE-14 / GATE-15:** Validación estricta y numérica de argumentos `--timeout` y variable `GRIPM_WATCHDOG_MS` para impedir ejecuciones instantáneas con `NaN` o `0ms`, y soporte de control de corte con `--bail` / `--no-bail`.
7. **GATE-01 / GATE-16:** Integración de `verify-changes.js --all` en CI (`.github/workflows/ci.yml`) y extensión del presupuesto de tiempo de ejecución de jobs de 25m a 35m.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Normalizar rutas con `toPosixPath` en `audit-ux-code.cjs` y remover el bypass de Windows en `verify-audit-ux-baseline.js` (GATE-03, GATE-04)
- [x] #2 Reemplazar catches silenciosos por logging y conteo de errores en `verify-backlog-sync.js` (GATE-05)
- [x] #3 Manejar fallos de escritura en `bulk_update` y unificar transición automática a `status: ready` en `mcp-server.ts` (GATE-06, GATE-17)
- [x] #4 Preservar el contrato de solo lectura en `verify-publish-surface.js` pasando `--ignore-scripts` a `npm pack` (GATE-10)
- [x] #5 Garantizar limpieza de archivos de prueba temporales (`DEV-998`, `DEV-999`) con `try/finally` y hooks de proceso (GATE-11)
- [x] #6 Validar argumentos `--timeout` numéricos y fallback seguro de `GRIPM_WATCHDOG_MS` (GATE-14, GATE-15)
- [x] #7 Integrar `verify-changes.js --all` y ampliar timeout a 35m en `.github/workflows/ci.yml` (GATE-01, GATE-16)
- [x] #8 Pirámide de verificación en verde: `npx tsc --noEmit`, `npm test`, `npm run backlog:check`, `npm run audit:ux`, `npm run build` y `npm run publish:check`
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Corregir `scripts/audit-ux-code.cjs` con `toPosixPath` y eliminar `if (isWindows)` en `scripts/verify-audit-ux-baseline.js`.
2. Actualizar `scripts/verify-backlog-sync.js` con manejo de errores audible en reglas 4, 5 y de documentación.
3. Actualizar `scripts/mcp-server.ts` para devolver `ok: false` ante errores en `bulk_update` y usar `status: ready` canónico.
4. Agregar `--ignore-scripts` a `scripts/verify-publish-surface.js`.
5. Asegurar limpieza en `scripts/verify-mcp-binary.js` y `scripts/verify-resilience-and-cli.js`.
6. Blindar parseo de timeout en `scripts/run-tests.js` y `scripts/watchdog.js`.
7. Actualizar `.github/workflows/ci.yml` con el step de `verify-changes.js --all` y timeout ampliado.
8. Ejecutar la Pirámide de Verificación y certificar la entrega en `ready`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Mantener compatibilidad estricta con Node 22+ y zero external dependencies en la capa de scripts.
- No mutar el archivo `scripts/uninstall.js` reservado para el agente paralelo.
<!-- SECTION:NOTES:END -->
