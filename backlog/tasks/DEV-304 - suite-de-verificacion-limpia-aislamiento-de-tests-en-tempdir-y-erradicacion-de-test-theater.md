---
id: DEV-304
title: "Suite de Verificación Limpia: Aislamiento de Tests en Tempdir y Erradicación de Test Theater"
status: ready
created_date: '2026-10-15'
updated_date: '2026-10-16 03:29'
labels:
  - "testing"
  - "ci"
  - "quality"
  - "pyramid"
dependencies: []
priority: high
type: tech_debt
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Saneamiento integral de la Pirámide de Verificación y el pipeline de pruebas: aislamiento físico de tests que mutan el sistema de archivos en directorios temporales independientes (`os.tmpdir()`), erradicación de aserciones frágiles basadas en búsqueda superficial de strings ("test theater"), y eliminación de falsos positivos en el auditor estático de UX.

### Diagnóstico de la Causa Raíz:

1. **Contaminación del Árbol de Trabajo Real:**
   En `scripts/verify-mcp-binary.js:12-43` y `scripts/verify-resilience-and-cli.js:6-42`, los tests crean y borran tareas de prueba (`DEV-998`, `DEV-999`, `anomalous-orphan-task-file.md`) directamente dentro del directorio real `backlog/tasks/` del repositorio y mutan `BACKLOG.md`. Si el proceso se interrumpe o corre en paralelo con git hooks, deja archivos huérfanos que provocan fallos en commits subsiguientes.
2. **Inspección Estática Superficial ("Test Theater"):**
   Varios pasos de la suite de 18 pruebas (`verify-focus-trap.js`, `test-ui-logic.js`, `verify-kanban-reorder.js`) no ejecutan código ni componentes reales; simplemente hacen `fs.readFileSync('src/...')` y buscan substrings con `.includes()` o regex. Esto produce checks verdes falsos aunque la lógica en runtime esté rota.
3. **Aserciones Acopladas a Datos Históricos Vivos:**
   En `scripts/verify-integration.js:159`, el test parsea el directorio real `backlog/tasks/` y comprueba que las tareas de `Sprint 3` coincidan exactamente con un array hardcodeado de 7 IDs (`DEV-047`, `DEV-049`, etc.). Cualquier edición, refinamiento o archivado de tareas históricas hace fallar la suite entera.
4. **Falsos Positivos de UX-010 y Hack de Constante Fija:**
   En `scripts/audit-ux-code.cjs`, la función `stripExpressions` elimina todas las llaves JSX `{...}` antes de verificar si un botón tiene texto accesible. Cualquier botón con un icono y una etiqueta internacionalizada `{t('...')}` dispara un falso positivo de `UX-010` (botón sin nombre accesible). Para tapar esto, `scripts/verify-audit-ux-baseline.js:37` hardcodea `const KNOWN_UX010_FALSE_POSITIVES = 12` y afirma `residual.length === 12`. Agregar o corregir un botón con i18n hace fallar los tests.
5. **Gaps en CI y Pre-Commit:**
   `.github/workflows/ci.yml` solo se dispara en `branches: [main]` ignorando `dev` donde ocurre el desarrollo activo; y `checkMcpBinarySync` en `verify-changes.js:295` resuelve imports desde el disco y no desde el índice Git, permitiendo falsos positivos/negativos si hay cambios sin stagear.

### Solución Arquitectónica Profunda:

- **Aislamiento en `os.tmpdir()`:**
  - Migrar `verify-mcp-binary.js` y `verify-resilience-and-cli.js` para que creen un entorno efímero mediante `fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-test-'))` y pasen `--repo <tmpDir>` al servidor MCP y al CLI, garantizando que el repositorio vivo jamás sea tocado durante los tests.
- **Pruebas de Comportamiento Real:**
  - Reemplazar la lectura de strings por invocaciones a funciones reales de dominio, validando entradas, salidas, mutaciones de estado y contratos de error.
  - Utilizar fixtures sintéticos aislados para `verify-integration.js`.
- **Detección de Texto Visible con Soporte de i18n:**
  - Enseñar a `audit-ux-code.cjs` a preservar llamadas de traducción como `t(...)` o `i18n.t(...)` sustituyéndolas por tokens visibles (`"__I18N_LABEL__"`) antes de pelar expresiones complejas.
  - Eliminar la constante artificial `KNOWN_UX010_FALSE_POSITIVES = 12` de `verify-audit-ux-baseline.js`.
- **Sincronización de CI:**
  - Configurar `ci.yml` para ejecutarse en `branches: [main, dev]`.
  - Conectar `checkMcpBinarySync` con un plugin de esbuild que lea imports relativos con `stagedContent()`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Ningún test de la suite de 18 pasos crea, muta o borra archivos dentro del árbol de trabajo del repositorio; todas las operaciones de prueba operan en directorios temporales aislados (`os.tmpdir()`)
- [x] #2 `scripts/verify-integration.js` opera contra fixtures deterministas sintéticos sin acoplarse al historial vivo de tareas en `backlog/tasks/`
- [x] #3 `scripts/audit-ux-code.cjs` reconoce expresiones JSX de traducción (`{t('...')}`) como texto accesible legítimo, eliminando falsos positivos en botones icon+label
- [x] #4 Se elimina la constante hardcodeada `KNOWN_UX010_FALSE_POSITIVES = 12` en `scripts/verify-audit-ux-baseline.js`
- [x] #5 `scripts/verify-changes.js` en `checkMcpBinarySync` evalúa dependencias transitivas directamente desde el índice Git
- [x] #6 `.github/workflows/ci.yml` se ejecuta automáticamente tanto en `main` como en `dev`
- [x] #7 La suite completa unificada (`npm test`) aprueba al 100% con aislamiento garantizado
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactorizar `scripts/verify-mcp-binary.js` y `scripts/verify-resilience-and-cli.js` para inicializar y limpiar `tmpDir`.
2. Reemplazar la aserción de Sprint 3 en `scripts/verify-integration.js` por un fixture dedicado.
3. Actualizar `stripExpressions` en `scripts/audit-ux-code.cjs` para preservar llamadas `t(...)`.
4. Eliminar `KNOWN_UX010_FALSE_POSITIVES` en `scripts/verify-audit-ux-baseline.js`.
5. Actualizar los triggers en `.github/workflows/ci.yml`.
6. Correr `npm test` verificando cero archivos residuales en git status.
<!-- SECTION:PLAN:END -->
