---
id: DEV-353
title: "Core Engine: Servicio Unificado de Auditoria Estatica (auditService) y Scanners de Salud"
status: ready
created_date: '2026-10-31'
updated_date: '2026-10-31'
labels:
  - "core"
  - "audit"
  - "engine"
  - "static-analysis"
  - "testing"
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Crear el motor base de auditoria estatica de Gripm (`server/services/auditService.ts` y script exportable `scripts/audit-engine.mjs`) que permite inspeccionar un repositorio de forma headless, sin dependencias pesadas y en menos de 2 segundos.

### Capacidades del Motor:
1. **Scanner de Presupuestos de Codigo (LOC Budgets):**
   - Basado en los estandares de `scripts/check-loc.mjs` (<1000 LOC techo rigido, 500-999 LOC advertencia).
   - Respeta `.gitignore`, `.locignore` y carpetas de distribucion (`node_modules`, `dist`, `.git`, `coverage`, `.gripm`).
   - Retorna lista clasificada de archivos criticos y advertencias.

2. **Scanner Anti-Slop (Calidad y Supresiones):**
   - Inspecciona archivos de codigo en busca de supresiones artificiales de tipado y linting: `@ts-ignore`, `@ts-nocheck`, `eslint-disable`, supresiones de pruebas y uso desmedido de `any`.
   - Registra cantidad, ubicacion (archivo:linea) y fragmento de contexto.

3. **Auto-Deteccion de Infraestructura de Pruebas:**
   - Inspecciona `package.json` (`scripts`, `devDependencies`, `dependencies`) y archivos de configuracion (`vitest.config.*`, `jest.config.*`, `pytest.ini`, `Cargo.toml`, etc.).
   - Identifica el test runner principal y el comando canónico de verificacion (`npm test`, `pytest`, `cargo test`, etc.).
   - Evalua si el comando responde con exit code limpio (`exit 0`).

4. **Scanner de Deuda Oculta (TODOs / FIXMEs):**
   - Escanea comentarios en codigo fuente bajo el patron `// (TODO|FIXME|HACK|BUG): <texto>` o bloques multi-linea equivalentes.
   - Retorna array estructurado de hallazgos: `{ id, file, line, type, text, snippet }`.

5. **Puntuacion de Salud Ponderada (Health Score 0-100):**
   - Genera un indice numerico transparente basado en penalizaciones objetivas (archivos sobredimensionados, supresiones de linter, ausencia de tests).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El modulo server/services/auditService.ts expone la funcion asincrona scanCodebase(targetPath, options) y retorna un objeto de resultado tipado segun el contrato de salud.
- [x] #2 El scanner de LOC detecta correctamente archivos superiores a 500 y 1000 lineas, omitiendo directorios ignorados estandar (node_modules, dist, .git).
- [x] #3 El scanner Anti-Slop reporta con precision la presencia de @ts-ignore, @ts-nocheck y eslint-disable con su linea correspondiente.
- [x] #4 El detector de tests identifica los principales runners (vitest, jest, node:test, pytest) y deduce el comando verifyCommand sugerido.
- [x] #5 El detector de TODOs extrae comentarios de tipo TODO, FIXME, HACK y BUG con archivo, numero de linea y descripcion.
- [x] #6 El calculo de score ponderado (0 a 100) es determinista y no arroja valores NaN o fuera de rango ante repositorios vacios o sin codigo fuente.
- [x] #7 El tiempo de ejecucion sobre un repositorio de 500 archivos fuente no supera los 2000 ms.
- [x] #8 Se incorpora prueba unitaria headless (test-audit-service.js) que valida todas las reglas y aprueba con codigo de salida 0 en npm test.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Modularizar la logica existente en `scripts/check-loc.mjs` para permitir su consumo programatico desde TypeScript y ESM/CJS.
2. Implementar los scanners estaticos con expresiones regulares optimizadas y lectura por streams (`node:fs`).
3. Disenar la funcion de calculo de `score` ponderado y normalizacion de resultados.
4. Escribir suite de pruebas unitarias headless en `scripts/test-audit-service.js` con fixtures representativos.
5. Ejecutar la Piramide de Verificacion (`npx tsc --noEmit` y `npm test`).
<!-- SECTION:PLAN:END -->
