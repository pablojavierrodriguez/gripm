---
id: DEV-362
title: "Automatizacion nativa de compuertas del ciclo de vida en el servidor MCP (start, submit, certify, unblock)"
status: draft
created_date: '2026-11-02'
updated_date: '2026-11-02'
labels:
  - "mcp"
  - "automation"
  - "gatekeeper"
  - "dx"
dependencies:
  - DEV-360
priority: high
type: feature
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
Hoy el flujo ágil de Gripm obliga a los agentes a alternar entre llamadas MCP (`gripm_get_task`, `gripm_update_task`) y la ejecución manual de scripts por terminal (`node scripts/gate-qa.mjs start`, `submit`, `<ID>`, `unblock`). Esto genera fricción operativa, errores de rutas de terminal en distintos IDEs (Cursor, Claude Code, Windsurf) y riesgo de que un agente intente mutar estados manualmente salteándose las validaciones.

El proceso debe ser **nativamente automatizado a través de MCP**, ejecutando las compuertas R1, T0, T1, T2 y T_unblock de forma transparente y reservando la intervención humana exclusivamente para la gestión de excepciones (ambigüedades de negocio, fallos de la Pirámide o arbitraje de deuda técnica con `force: true`).

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  1. Integrar en `BacklogService` y exponer en `scripts/mcp-server.ts` la ejecución automática de las invariantes de transición al invocar `gripm_update_task` (o herramientas dedicadas `gripm_transition_task`):
     - `draft -> doing` (T0): Verifica mecánicamente Gate R1 (presencia de ACs no vacíos y dependencias en `ready`/`done`) y estampa automáticamente `claimed_by` con la identidad del actor (`actorId`).
     - `doing -> review` (T1): Verifica que el 100% de los ACs estén `[x]` y las dependencias resueltas.
     - `review -> ready` (T2): Verifica *anti-self-certification* (`certifier !== claimed_by`), ejecuta la Pirámide de Verificación + salud estructural (`checkStructuralHealth` y anti-slop en diff) y promueve a `ready` sincronizando `BACKLOG.md` automáticamente.
     - `blocked -> doing|draft` (T_unblock): Verifica que las dependencias declaradas estén en `ready`/`done` y limpia `blocked_reason`.
  2. Mantener la opción de `force: true` con registro de auditoría (`GatekeeperAudit`) para cuando el Product Owner humano autorice explícitamente una excepción o modo manual.
- **Out-of-Scope:**
  - Permitir que el MCP promueva a `done` sin un release publicado.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Transicionar una tarea vía MCP (`gripm_update_task`) de `draft` a `doing` valida automáticamente Gate R1 (existencia de ACs y dependencias resueltas) y registra `claimed_by` sin requerir comandos de terminal externos.
- [ ] #2 Transicionar de `doing` a `review` vía MCP bloquea la operación si existen ACs sin tildar (`- [ ]`) o dependencias no resueltas, devolviendo el listado exacto de criterios pendientes.
- [ ] #3 Transicionar de `review` a `ready` vía MCP valida *anti-self-certification* (`actorId` distinto de `claimed_by`), anti-slop en el diff y ejecuta la verificación configurada antes de sellar `status: ready` y auto-sincronizar `BACKLOG.md`.
- [ ] #4 Si el proyecto tiene configurado `"automation": "manual-override"` en `.gripm/config.json` o el PO envía `force: true`, el Gatekeeper permite la excepción dejando trazabilidad explícita en la respuesta.
- [ ] #5 `scripts/verify-mcp-binary.js` y `scripts/test-backlog-service.js` validan las 4 transiciones automatizadas (T0, T1, T2, T_unblock) y sus casos de rechazo por invariantes.
- [ ] #6 La Pirámide de Verificación completa y el rebuild de binarios (`npm run build:bin`) pasan con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Conectar las validaciones de `task-inspection` / `anti-slop` de `@gripm/playbook` en el flujo de transición de `BacklogService` y `mcp-server.ts`.
2. Añadir parámetros opcionales `actorId` en `gripm_update_task` para soportar `claimed_by` y verificación de *anti-self-certification* en T2.
3. Auto-invocar la sincronización de `BACKLOG.md` tras cada transición exitosa en MCP.
4. Recompilar `bin/gripm-mcp.js` (`npm run build:bin`) y añadir tests en `scripts/verify-mcp-binary.js`.
<!-- SECTION:PLAN:END -->
