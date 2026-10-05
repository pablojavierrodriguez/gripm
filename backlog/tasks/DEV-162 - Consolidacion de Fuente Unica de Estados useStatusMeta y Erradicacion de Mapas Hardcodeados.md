---
id: DEV-162
title: "Consolidación de Fuente Única de Estados useStatusMeta y Erradicación de Mapas Hardcodeados"
status: done
created_date: '2026-10-04'
updated_date: '2026-10-04 17:40'
labels:
  - "i18n"
  - "refactor"
  - "ux"
  - "open-source-launch"
  - "technical-debt"
dependencies:
  - "DEV-153"
  - "DEV-161"
priority: high
type: refactor
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Consolidar una fuente única de verdad para el consumo de metadatos y traducción de estados (`useStatusMeta`), eliminando los mapas de estados divergentes hardcodeados en cliente (`SprintView.tsx`, `KanbanBoard.tsx`, `ItemCard.tsx`).

### Problema

1. **Mapas duplicados y divergentes a nivel de módulo:**
   - `SprintView.tsx` definía `statusLabels: Record<ItemStatus, { label: string; color: string }>` con `dismissed: 'Descartado'` y `cancelled: 'Cancelado'`.
   - `KanbanBoard.tsx` definía y exportaba `STATUS_META: Record<string, { label, dot, bg, border }>` con `dismissed: 'Descartado'` y `cancelled: 'Cancelado'`.
   - `ItemCard.tsx` definía `statusLabels: Record<string, string>` en inglés puro, con `ideas: 'Ideas (Discovery)'`.
2. **Fugas de idioma (Language Leakage):**
   - En la interfaz en inglés, `SprintView` y `KanbanBoard` renderizaban 'Descartado' y 'Cancelado' en español.
   - En la interfaz en español, `ItemCard` renderizaba 'Draft', 'Doing', 'Review', 'Ready', 'Done' en inglés dentro del menú contextual de cambio de estado.
3. **Inconsistencia de nomenclatura:**
   - La etiqueta para `ideas` divergía entre `'Ideas'` (en Kanban y Sprint) e `'Ideas (Discovery)'` (en ItemCard y diccionario).

### Solución

1. Crear `src/utils/statusMeta.ts` exponiendo `useStatusMeta()` y `getStatusMeta(status, t)` conectado a `useTranslation()` y a las 8 claves canónicas `status.*`.
2. Unificar la normalización de estados legacy (`backlog` → `draft`, `in_progress` → `doing`, `testing_qa` → `review`, `finish` → `ready`).
3. Reemplazar los 3 mapas locales en `SprintView.tsx`, `KanbanBoard.tsx` e `ItemCard.tsx` por el consumo unificado de `useStatusMeta()`.
4. Unificar en diccionarios `src/locales/en.json` y `src/locales/es.json` la clave `status.ideas` a `"Ideas"`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Crear hook y utilidad `src/utils/statusMeta.ts` con normalización legacy y soporte para los 8 estados canónicos
- [x] #2 Unificar clave `status.ideas` a `"Ideas"` en `src/locales/en.json` y `src/locales/es.json`
- [x] #3 Refactorizar `src/components/SprintView.tsx` eliminando `statusLabels` y consumiendo `useStatusMeta()`
- [x] #4 Refactorizar `src/components/KanbanBoard.tsx` eliminando `STATUS_META` y consumiendo `useStatusMeta()`
- [x] #5 Refactorizar `src/components/ItemCard.tsx` eliminando `statusLabels` y consumiendo `useStatusMeta()`
- [x] #6 Cero ocurrencias de mapas hardcodeados de etiquetas de estados en componentes clientes
- [x] #7 Verificación ejecutable de no-regresión: `npx tsc --noEmit` y `npm test` en verde
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear `src/utils/statusMeta.ts` con tests de tipos e integración directa con `useTranslation`.
2. Actualizar `src/locales/en.json` y `src/locales/es.json` para normalizar `status.ideas`.
3. Migrar `SprintView.tsx`, `KanbanBoard.tsx` e `ItemCard.tsx` para consumir `useStatusMeta`.
4. Ejecutar pirámide de verificación y gate de calidad (`tsc`, `npm test`, `npm run backlog:check`).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Invariante: No modificar la estructura externa ni romper los contratos de drag and drop en KanbanBoard o la visualización de badges en SprintView e ItemCard.
<!-- SECTION:NOTES:END -->
