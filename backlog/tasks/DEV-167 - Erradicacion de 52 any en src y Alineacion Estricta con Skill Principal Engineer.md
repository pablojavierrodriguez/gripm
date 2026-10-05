---
id: DEV-167
title: "Erradicación de 52 any en src/ y Alineación Estricta con Skill Principal Engineer"
status: draft
created_date: '2026-10-04'
updated_date: '2026-10-04 20:00'
labels:
  - "typescript"
  - "types"
  - "refactor"
  - "technical-debt"
  - "post-launch"
dependencies: []
priority: low
type: refactor
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En la base de código de `src/` persisten aproximadamente 52 a 55 anotaciones explícitas de tipo `any`, a pesar de que el compilador TypeScript opera con `"strict": true` y la directiva técnica `principal-engineer` exige tipado riguroso sin evasiones de linter.

### Diagnóstico de Causa Raíz

1. **Manejo de excepciones:** Más de 25 ocurrencias provienen del patrón `catch (err: any)` en `src/App.tsx`, `ReleaseAssembler.tsx`, `SettingsView.tsx` y diversos modales, donde luego se accede a `err.message`.
2. **Callbacks genéricos en vistas:** Parámetros como `retroData?: any` en `handleCompleteSprint` (`App.tsx`, `SprintView.tsx`) y `value: any` en `handleUpdateColumnField` (`SettingsView.tsx`) y `updateItemField` (`ImportWizardModal.tsx`).
3. **Manejadores de eventos y red:** Propiedades como `data: any`, `items?: any[]` y `(evt: any)` en `src/api.ts`.

### Problema

La presencia de `any` debilita el contrato de tipos en tiempo de compilación y contradice el guardrail de la skill `principal-engineer`, restándole credibilidad normativa al sistema de diseño y arquitectura.

### Objetivo

Refactorizar los tipos en `src/` para eliminar las anotaciones `any`:
- Migrar cláusulas de captura a `catch (err: unknown)` usando asistentes seguros de extracción de mensaje (ej. `getErrorMessage(err)`).
- Tipar formalmente `retroData` (interfaz `SprintRetroData`), payloads de Server-Sent Events y campos dinámicos de formularios.
- Lograr que `grep -rn --include="*.ts" --include="*.tsx" ": any" src/` devuelva cero ocurrencias.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Reemplazar `catch (err: any)` por `catch (err: unknown)` con validación defensiva en `src/App.tsx` y modales
- [ ] #2 Tipar estrictamente `retroData`, payloads SSE y firmas de actualización en `src/api.ts`, `SettingsView.tsx` y `SprintView.tsx`
- [ ] #3 `grep -rn --include="*.ts" --include="*.tsx" ": any" src/` retorna 0 coincidencias
- [ ] #4 `npx tsc --noEmit` compila limpiamente con 0 errores de tipado estricto
- [ ] #5 La suite unificada de tests `npm test` pasa íntegra con exit code 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear una función utilitaria defensiva `getErrorMessage(err: unknown): string` en `src/utils/errors.ts` o consolidar la existente.
2. Sustituir progresivamente los bloques `catch (err: any)` en `src/App.tsx` y componentes asociados.
3. Declarar las interfaces para datos de retrospectiva y eventos SSE en `src/types/index.ts`.
4. Tipar fuertemente las firmas genéricas de actualización de columnas y campos en `SettingsView.tsx`.
5. Ejecutar `npx tsc --noEmit` y `npm test` para asegurar compatibilidad total.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Invariante: Prohibido reemplazar `: any` por `@ts-ignore` o dobles aserciones como `as unknown as Foo`; usar type guards e inferencia segura de TypeScript.
<!-- SECTION:NOTES:END -->
