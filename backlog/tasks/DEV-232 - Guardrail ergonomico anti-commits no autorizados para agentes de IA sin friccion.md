---
id: DEV-232
title: "Política pragmática de commits y gobernanza de Git respaldada por hooks pre-commit"
status: done
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "git"
  - "workflow"
  - "guardrails"
  - "playbook"
  - "dx"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evolucionar la gobernanza de Git en el Playbook y en Gripm hacia un modelo pragmático, libre de burocracia innecesaria y respaldado por la garantía mecánica de los hooks pre-commit:
1. **El hook pre-commit como guardián de calidad:** Reconocer que la integridad del repositorio está asegurada por el hook `verify-backlog-sync.js` y la Pirámide de Verificación (tipos, tests, sincronización). Ningún commit roto puede ingresar al historial.
2. **Cadencia limpia de commits (1 tarea = 1 commit consolidado):** Evitar la proliferación de micro-commits desordenados durante la fase exploratoria. La norma canónica es un commit atómico y limpio por tarea completada y certificada, incluyendo el archivo `.md` de la tarea y el código asociado.
3. **Erradicación de bloqueos burocráticos:** Descartar contraseñas, tokens o mecanismos que entorpezcan el flujo de trabajo tanto del desarrollador humano como del agente.
4. **Claridad en la soberanía de commits:** Definir pautas claras en `AGENTS.md` y `git-workflow.md` sobre cuándo el agente debe preparar el commit o solicitar confirmación según el modo operativo (autónomo vs asistido), manteniendo siempre mensajes convencionales estandarizados (`feat(DEV-XXX): ...`, `fix(DEV-XXX): ...`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Actualizacion de la politica de commits en AGENTS.md y git-workflow.md enfatizando la cadencia de 1 commit consolidado por tarea
- [x] #2 Reafirmacion de los hooks pre-commit como unica salvaguarda mecanica indispensable sin burocracia adicional
- [x] #3 Formato canonico de mensaje de commit estandarizado vinculado de forma univoca al ID de la tarea DEV-XXX
- [x] #4 Guia clara para agentes sobre cuando preparar cambios y como interactuar con el arbol de trabajo
- [x] #5 npm run backlog:check y npm test pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Mantener la trazabilidad total: el archivo de la tarea .md se commitea en el mismo movimiento que el código que la resuelve.
- Preservar la experiencia de usuario nativa de Git sin fricciones.
<!-- SECTION:NOTES:END -->
