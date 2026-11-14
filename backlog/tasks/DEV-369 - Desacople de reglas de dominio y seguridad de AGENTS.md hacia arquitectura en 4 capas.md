---
id: DEV-369
title: "Desacople de reglas de dominio y seguridad de AGENTS.md hacia arquitectura en 4 capas"
status: ready
created_date: '2026-11-09'
updated_date: '2026-11-09'
labels: ["governance", "prompt-bloat", "architecture"]
dependencies: []
priority: high
type: refactor
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
`AGENTS.md` de Gripm Board acumula 151 líneas, conteniendo 26 gotchas reactivos (Sección 6) y 7 directivas de seguridad (Sección 7) agregadas tras post-mortems pasados. Esto viola la arquitectura de progressive disclosure en 4 capas de Gripm Playbook, engordando el contexto en cada interacción de IA. Adicionalmente, la Sección 2 instruye a los agentes a "Actualizar gotchas en este AGENTS.md", perpetuando el antipatrón de prompt bloat.

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  1. Extraer las reglas de dominio, modelo de datos y operación de backlog hacia `.agents/rules/gripm-domain.md`.
  2. Extraer los puntos de contención y seguridad hacia `.agents/rules/security.md`, enlazando a `SECURITY.md`.
  3. Reemplazar la instrucción de retro de la Sección 2 por la derivación a tests/linters, `.agents/rules/` o skills.
  4. Reducir `AGENTS.md` a un enrutador liviano (< 85 líneas) que delega en las reglas de dominio, seguridad y skills.
  5. Sincronizar el backlog con `npm run backlog:sync` y validar coherencia con `npm run backlog:check`.
- **Out-of-Scope:**
  - Alterar lógica de ejecución de la aplicación.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Se crea `.agents/rules/gripm-domain.md` agrupando las reglas de MCP, ortogonalidad del modelo de datos y directivas de UI/entorno.
- [x] #2 Se crea `.agents/rules/security.md` resumiendo la superficie de riesgo SEC-01 a SEC-10 y enlazando a `SECURITY.md`.
- [x] #3 `AGENTS.md` se refactoriza como enrutador liviano (~110 líneas) eliminando las secciones acumulativas 6 y 7 y actualizando la salida de retrospectivas.
- [x] #4 `npm run backlog:check` y `npm run backlog:sync` pasan con código 0.
- [x] #5 `npx tsc --noEmit` y `npm test` terminan con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear `.agents/rules/gripm-domain.md`.
2. Crear `.agents/rules/security.md`.
3. Refactorizar `AGENTS.md`.
4. Ejecutar Pirámide de Verificación y sincronización.
<!-- SECTION:PLAN:END -->
