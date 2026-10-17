---
id: DEV-312
title: "Paridad de Estados: Soporte Canónico de 'blocked' (con blocked_reason) y 'dismissed' en el Tablero y Parser"
status: draft
created_date: '2026-10-17'
updated_date: '2026-10-17'
labels:
  - "state-machine"
  - "parser"
  - "playbook"
  - "ui"
  - "types"
dependencies: []
priority: high
type: feature
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Alinear la máquina de estados de `@gripm/board` con el estándar canónico de `@gripm/playbook` v2.3.0 (`.agents/STATE_MACHINE.md`), incorporando `blocked` (junto con el metadato obligatorio `blocked_reason`) y formalizando `dismissed` en el parser Markdown, el servidor MCP y la interfaz visual.

### Diagnóstico de la Causa Raíz:

1. **Degradación Silenciosa de `blocked` a `draft`:**
   En `scripts/backlogMdParser.ts`, el tipo `CanonicalStatus` omite `blocked`. En la función `normalizeStatus`, cualquier tarea con `status: blocked` cae en la rama `default: return 'draft'`. Si un agente o usuario marca una tarea como bloqueada conforme a la metodología Playbook, Gripm Board destruye el estado al leer o guardar el archivo.
   
2. **Falta del Campo `blocked_reason` y `dismissed_reason`:**
   La máquina de estados del Playbook establece que `blocked` exige un motivo no vacío (`blocked_reason`) para evitar la inflación de WIP, y que `dismissed` exige `dismissed_reason`. Actualmente, `BacklogMdTask` y `BacklogItem` no modelan estos campos como propiedades formales de primer nivel.

3. **Inconsistencia de `cancelled`:**
   `CanonicalStatus` declara `'cancelled'` en su tipo unión, pero `normalizeStatus('cancelled')` devuelve `'dismissed'`, generando ambigüedad entre el tipado estático y el runtime.

### Solución Técnica:

- Incorporar `'blocked'` en `CanonicalStatus` (`scripts/backlogMdParser.ts`) y en `ItemStatus` (`src/types.ts`).
- Actualizar `normalizeStatus` para que devuelva `'blocked'` cuando reciba `'blocked'` o `'impediment'`.
- Añadir `blockedReason` y `dismissedReason` al modelo de datos de tareas y mapearlo en frontmatter (`blocked_reason` / `dismissed_reason`).
- Integrar la columna / badge visual de tareas bloqueadas en `KanbanBoard` e `ItemCard`, y el campo de motivo en `ItemModal`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `CanonicalStatus` e `ItemStatus` incluyen `'blocked'` como valor válido de primera clase
- [ ] #2 `normalizeStatus('blocked')` devuelve `'blocked'` y nunca se degrada a `'draft'`
- [ ] #3 `backlogMdParser.ts` parsea y serializa `blocked_reason` y `dismissed_reason` en el frontmatter YAML
- [ ] #4 `ItemModal` permite ingresar y editar el motivo de bloqueo cuando una tarea pasa a `blocked`
- [ ] #5 `KanbanBoard` e `ItemCard` muestran visualmente el indicador de bloqueo con su tooltip descriptivo
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extender `CanonicalStatus` y `normalizeStatus` en `scripts/backlogMdParser.ts`.
2. Actualizar `src/types.ts` (`ItemStatus`, `BacklogItem`).
3. Mapear `blockedReason` y `dismissedReason` en `mapMarkdownTaskToCanonical` y `serializeBacklogMd`.
4. Añadir soporte visual en `ItemCard.tsx` y `ItemModal.tsx`.
5. Ejecutar `scripts/test-parser.js` y `scripts/test-ui-logic.js`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
<!-- SECTION:NOTES:END -->
