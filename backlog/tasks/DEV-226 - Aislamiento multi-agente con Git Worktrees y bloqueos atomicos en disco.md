---
id: DEV-226
title: "Aislamiento multi-agente con Git Worktrees y bloqueos atómicos en disco"
status: draft
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "git"
  - "worktrees"
  - "concurrency"
  - "cli"
  - "mcp"
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Permitir que múltiples sesiones de agentes (o un agente y el desarrollador) trabajen en paralelo sobre distintas tareas sin pisarse el directorio de trabajo ni generar inconsistencias en los archivos de backlog:
1. **Comandos de aislamiento en CLI y MCP:** Incorporar comandos para inicializar y aislar una tarea en un nuevo Git Worktree (`gripm worktree create <TASK-ID>`), creando una carpeta aislada en `.gripm/worktrees/<TASK-ID>` y una rama dedicada `feature/<TASK-ID>`.
2. **Mecanismo de bloqueo atómico (File Locks):** Implementar bloqueos en disco con timeout para prevenir condiciones de carrera cuando dos procesos o agentes intenten mutar tareas o regenerar el backlog simultáneamente.
3. **Reintegración y limpieza:** Comando `gripm worktree finish <TASK-ID>` para sincronizar el estado, reintegrar la rama y limpiar el worktree temporal asegurando que la tarea quede en estado `ready`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Comando CLI gripm worktree create <TASK-ID> para inicializar y aislar una tarea en un nuevo worktree
- [ ] #2 Mecanismo de bloqueo (file lock) en disco que previene condiciones de carrera en mutaciones simultaneas
- [ ] #3 Comando para sincronizar y reintegrar la rama del worktree una vez finalizada la tarea
- [ ] #4 npm test y npx tsc --noEmit pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Garantizar que los worktrees creados se ubiquen en directorios ignorados por Git por defecto (`.gripm/worktrees/`).
<!-- SECTION:NOTES:END -->
