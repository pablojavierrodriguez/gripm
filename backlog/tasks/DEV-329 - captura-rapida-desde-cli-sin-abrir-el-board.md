---
id: DEV-329
title: "Captura rápida desde CLI sin abrir el board"
status: ideas
created_date: '2026-10-22'
updated_date: '2026-10-22'
labels:
  - "cli"
  - "product"
  - "dx"
priority: medium
type: feature
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Hoy un humano que quiere registrar una tarea debe abrir el board en el browser o recurrir al MCP (que está pensado para agentes). OpenTodo expone `ot add "Call the plumber" --due tomorrow --priority 2` como binario separado. gripm ya distribuye el binario `gripm`, así que el camino natural es un subcomando de captura que escriba directamente en el storage del proyecto (`backlog/tasks/*.md` o `.gripm/backlog.json`).

La escritura debe reutilizar el mismo motor de persistencia que el board y el MCP para que el resultado pase por `backlog:check` y `backlog:sync` sin divergencias. El comando debe respetar el engine de storage configurado del proyecto y fallar con mensaje claro si no hay proyecto inicializado.

Es una iniciativa de descubrimiento: definir el contrato del comando (flags, salida, manejo de errores) antes de implementar, y evaluar si convive con un quick add en lenguaje natural (DEV-328) o lo precede.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `gripm add` crea una tarea en el engine de storage activo del proyecto usando el mismo camino de escritura que el board.
- [ ] #2 La tarea resultante pasa `npm run backlog:check` sin correcciones posteriores.
- [ ] #3 El comando falla con mensaje accionable cuando el directorio no es un proyecto gripm inicializado.
- [ ] #4 Los flags documentados (título, fecha, prioridad, tipo) tienen cobertura de test o verificación ejecutable.
- [ ] #5 El uso queda documentado junto al resto de flags CLI del README.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Definir el contrato del subcomando y su semántica de errores.
2. Reutilizar el módulo de escritura existente (board/MCP) sin duplicar lógica de frontmatter.
3. Implementar, testear en ambos engines de storage y documentar.
<!-- SECTION:PLAN:END -->
