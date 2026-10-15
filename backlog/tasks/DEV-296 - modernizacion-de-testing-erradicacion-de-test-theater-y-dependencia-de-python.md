---
id: DEV-296
title: "Modernización de Testing: Erradicación de test theater y eliminación de dependencia de Python"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "testing"
  - "ci"
  - "tech_debt"
  - "vitest"
dependencies: []
priority: p3
type: tech_debt
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reemplazo gradual del arnés de pruebas casero (`18 subprocesos de Node en scripts/run-tests.js`) por un test runner estándar de la industria (Vitest), eliminando las aserciones por búsqueda de cadenas de texto sobre archivos `.tsx` y erradicando la dependencia de Python/PyYAML en el CI.

### Problemas identificados:

1. **Test Theater por Inspección de Texto ("String-Matching Testing"):**
   - En `scripts/verify-focus-trap.js:38-57`, para probar `useFocusTrap.ts`, lee el archivo con `fs.readFileSync` y hace `assert.ok(hook.includes("event.key !== 'Tab'"))`. Si se cambia el nombre de la variable o se comenta el código interno, el test da falsos positivos o falsos negativos.
   - En `scripts/test-ui-logic.js:89-117`, el stacking context se prueba leyendo clases de Tailwind en `Header.tsx` mediante regex.
   - En `scripts/verify-kanban-reorder.js:22-43`, se duplicó el código de reordenamiento en el archivo de test para probar su propia copia local.
2. **Dependencia Oculta de Python en Proyecto TypeScript:**
   En `scripts/verify-changes.js:77-98`, para validar YAML sin instalar un paquete de Node, el script busca `python3` y ejecuta `import yaml`. Esto obliga a todos los pipelines de GitHub Actions a instalar Python y correr `pip install pyyaml`.
3. **Contaminación del Repositorio por Tests:**
   `scripts/verify-mcp-binary.js:13-14` y `scripts/verify-resilience-and-cli.js:6-9` escriben archivos de prueba reales (`DEV-998`, `DEV-999`) dentro de `backlog/tasks/`, ensuciando el working tree del desarrollador si el test se cancela a la mitad.

### Estrategia de Modernización:
- Adoptar Vitest como test runner unificado con ejecución concurrente en memoria (reduciendo el tiempo de suite de 40s a ~3s).
- Reemplazar la validación de YAML de Python por un parser estándar de JavaScript.
- Aislar fixtures de prueba a `fs.mkdtempSync(path.join(os.tmpdir(), ...))`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Se configura Vitest para la ejecución unificada de pruebas unitarias y de integración en memoria
- [ ] #2 Los tests de inspección de texto plano (`verify-focus-trap.js`, `test-ui-logic.js`) se reemplazan por aserciones de comportamiento reales
- [ ] #3 Se elimina la invocación a Python en `scripts/verify-changes.js`, utilizando un parser nativo de JavaScript para validar YAML
- [ ] #4 Los tests que crean archivos de prueba operan exclusivamente en directorios temporales (`os.tmpdir()`), sin ensuciar `backlog/tasks/`
- [ ] #5 La suite completa aprueba en CI sin requerir `setup-python` ni `pip install`
<!-- AC:END -->

## Implementation Notes

- Archivos principales: [scripts/run-tests.js](file:///c:/Users/Pablo/Proyectos/gripm/scripts/run-tests.js), [scripts/verify-changes.js](file:///c:/Users/Pablo/Proyectos/gripm/scripts/verify-changes.js) (líneas 77-98), [scripts/verify-focus-trap.js](file:///c:/Users/Pablo/Proyectos/gripm/scripts/verify-focus-trap.js), [scripts/verify-kanban-reorder.js](file:///c:/Users/Pablo/Proyectos/gripm/scripts/verify-kanban-reorder.js), [.github/workflows/ci.yml](file:///c:/Users/Pablo/Proyectos/gripm/.github/workflows/ci.yml).
