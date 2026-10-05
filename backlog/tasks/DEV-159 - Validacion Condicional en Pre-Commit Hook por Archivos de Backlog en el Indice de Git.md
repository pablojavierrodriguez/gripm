---
id: DEV-159
title: "Validacion Condicional en Pre-Commit Hook por Archivos de Backlog en el Indice de Git"
status: done
created_date: '2026-10-04'
updated_date: '2026-10-04 06:51'
labels:
  - "git-hooks"
  - "backlog"
  - "hygiene"
  - "safety"
dependencies: []
priority: medium
type: feature
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementación de validación condicional en el hook pre-commit (scripts/verify-backlog-sync.js --hook y .githooks/pre-commit). El hook solo ejecuta la verificación de coherencia si el índice de Git (git diff --cached --name-only) contiene archivos de backlog (BACKLOG.md o tareas en backlog/tasks/). Si el commit no toca el backlog, se omite con código 0 preservando commits atómicos. Si toca el backlog, valida coherencia e impide tareas fantasma o desfase sin mutar el índice.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 scripts/verify-backlog-sync.js --hook inspecciona git diff --cached --name-only para detectar archivos de backlog stageados
- [x] #2 Si no hay archivos de backlog stageados en el commit, el hook omite la validación y retorna código 0 permitiendo commits de solo código o documentación
- [x] #3 Si hay tareas stageadas en backlog/tasks/, verifica que BACKLOG.md también esté stageado y sincronizado con las mismas
- [x] #4 Si BACKLOG.md está stageado, verifica que ninguna tarea referenciada sea un archivo fantasma inexistente en Git o en el commit
- [x] #5 El hook opera de forma estrictamente no invasiva sin mutar el índice ni ejecutar git add automático
- [x] #6 Pirámide de verificación en verde (tsc, npm test, backlog:check, publish:check, build) con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Modificar scripts/verify-backlog-sync.js para leer los archivos stageados en el índice de Git bajo el flag --hook.
2. Añadir bypass inmediato (exit 0) si no hay archivos de backlog stageados.
3. Añadir validación cruzada: si se stagea una tarea, exigir BACKLOG.md stageado; si se stagea BACKLOG.md, verificar que las tareas existan en Git o en el stage.
4. Añadir test automatizado para verificar el comportamiento condicional.
5. Ejecutar npm run backlog:sync y validar pirámide de verificación.
<!-- SECTION:PLAN:END -->
