---
id: DEV-364
title: "Descomposicion modular de God-Components de Frontend y utilidades bajo 1000 LOC"
status: ready
created_date: '2026-11-02'
updated_date: '2026-11-02'
labels:
  - "refactor"
  - "frontend"
  - "modularity"
  - "clean-code"
dependencies: []
priority: high
type: refactor
estimate: 8
claimed_by: "antigravity:subagent-dev-364"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
El frontend de `@gripm/board` presenta 5 archivos que superan el límite estricto de 1000 líneas de código (`check-loc.mjs`), degradando el Health Score del repositorio a 37/100 y dificultando el mantenimiento y el trabajo en paralelo de agentes:
1. `src/components/SprintView.tsx` (**2.371 LOC**)
2. `src/App.tsx` (**1.891 LOC**)
3. `src/components/KanbanBoard.tsx` (**1.467 LOC**)
4. `src/components/ReleaseAssembler.tsx` (**1.224 LOC**)
5. `src/utils/universalImporter.ts` (**1.036 LOC**)

Además, `src/components/Header.tsx` se encuentra en **992 LOC** (al borde de la infracción crítica).

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  1. Descomponer `src/components/SprintView.tsx` extrayendo subcomponentes y hooks en `src/components/sprint/` (`SprintHeader.tsx`, `SprintBacklogDrawer.tsx`, `SprintBoardColumns.tsx`, `RetrospectivePanel.tsx`, `useSprintOperations.ts`).
  2. Descomponer `src/App.tsx` extrayendo hooks de coordinación y estado en `src/hooks/` (`useProjectBootstrap.ts`, `useSSEUpdates.ts`, `useKeyboardShortcuts.ts`, `useItemMutations.ts`).
  3. Descomponer `src/components/KanbanBoard.tsx` extrayendo subcomponentes en `src/components/kanban/` (`KanbanColumn.tsx`, `KanbanListView.tsx`, `BulkActionsBar.tsx`, `useKanbanDragAndDrop.ts`).
  4. Descomponer `src/components/ReleaseAssembler.tsx` extrayendo vistas en `src/components/release/` (`ReleaseCandidateBuilder.tsx`, `ReleaseHistoryList.tsx`, `ReleaseNotesPreviewModal.tsx`).
  5. Descomponer `src/utils/universalImporter.ts` separando los adaptadores de formato (Jira/Linear/Trello/CSV/GitHub/Markdown) en `src/utils/importers/`.
  6. Reducir `src/components/Header.tsx` (< 750 LOC) extrayendo selectores/menús secundarios.
- **Out-of-Scope:**
  - Alterar estilos visuales, comportamiento de negocio o flujos de usuario existentes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `SprintView.tsx`, `App.tsx`, `KanbanBoard.tsx`, `ReleaseAssembler.tsx`, `universalImporter.ts`, `Header.tsx` y todos los submódulos extraídos tienen **menos de 1000 líneas de código** (0 violaciones críticas en `src/`).
- [x] #2 `node scripts/check-loc.mjs --strict --src src` pasa con código 0 y **0 violaciones**.
- [x] #3 No se introducen regresiones en las pruebas de lógica UI (`test-ui-logic.js`, `verify-density-1366.js`, `verify-focus-trap.js`, `verify-kanban-reorder.js`, `verify-status-contrast.js`) ni en el smoke test de UI (`npm run test:ui`).
- [x] #4 `npx tsc --noEmit`, `npm run build` y `npm test` pasan con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactorizar `SprintView.tsx` en `src/components/sprint/*`.
2. Refactorizar `App.tsx` extrayendo hooks de sincronización, atajos y mutaciones en `src/hooks/*`.
3. Refactorizar `KanbanBoard.tsx` en `src/components/kanban/*` y `ReleaseAssembler.tsx` en `src/components/release/*`.
4. Refactorizar `universalImporter.ts` en `src/utils/importers/*` y aligerar `Header.tsx`.
5. Verificar que `verify-density-1366.js` y `verify-audit-ux-baseline.js` sigan pasando (actualizando rutas o baseline si una línea se movió de archivo).
6. Ejecutar la Pirámide de Verificación completa.
<!-- SECTION:PLAN:END -->
