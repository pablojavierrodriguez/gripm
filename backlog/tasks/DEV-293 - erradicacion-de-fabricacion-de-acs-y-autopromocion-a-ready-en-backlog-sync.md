---
id: DEV-293
title: "Gobernanza de Calidad: Erradicación de fabricación de ACs y auto-promoción a ready en backlog sync"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-15 23:26'
labels:
  - "backlog"
  - "state-machine"
  - "governance"
  - "qa"
dependencies: []
priority: high
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!\-- SECTION:DESCRIPTION:BEGIN -->
Corrección en el script de sincronización y verificación de backlog (`scripts/verify-backlog-sync.js`) para erradicar la alteración ilegítima de estados y la falsificación automática de criterios de aceptación (`- [ ]` ➔ `- [x]`).

### Problemas identificados y reproducibles:

1. **Fabricación automática de criterios de aceptación cumplidos:**
   En `scripts/verify-backlog-sync.js:236-242`, si una tarea está en estado `done` pero tiene criterios sin tildar (`- [ ]`), ejecutar `npm run backlog:sync` (modo `--fix`) ejecuta:
   ```javascript
   const fixedAcBlock = acBlock.replace(/-\s*\[ \]/g, '- [x]');
   ```
   Tildando mecánicamente todos los criterios como aprobados sin ninguna verificación ejecutable. Esto viola directamente la regla de seguridad `SEC-02` y falsea la trazabilidad histórica de pruebas.
2. **Auto-promoción ilegítima a `ready` saltando `review` y QA:**
   En `scripts/verify-backlog-sync.js:220-228`, si todos los ACs de una tarea en `doing` están tildados, el modo `--fix` cambia su estado automáticamente a `status: ready`.
   Esto viola la Invariante Fundamental de `STATE_MACHINE.md` y `AGENTS.md` (el paso a `ready` es potestad exclusiva del rol QA tras auditar bajo la Pirámide de Verificación).
3. **Diffs artificiales de Git por fecha diaria en `BACKLOG.md`:**
   En `scripts/backlogMdParser.ts:759`, `generateMonolithicBacklogMd` estampa `> Consolidado generado el ${now} por gripm ⚡`. Ejecutar el sync al día siguiente sin cambios en tareas produce un commit innecesario por la fecha.

### Script de Reproducción Inmediata (PoC):

```bash
# Crear tarea en done con AC pendiente
cat << 'EOF' > backlog/tasks/DEV-997\ -\ Test\ Sync.md
---
id: DEV-997
title: Tarea Test
status: done
---
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
