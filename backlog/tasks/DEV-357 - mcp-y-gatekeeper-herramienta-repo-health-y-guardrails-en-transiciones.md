---
id: DEV-357
title: "MCP y Gatekeeper: Herramienta repo_health y Guardrails Arquitectonicos en Transiciones de Tarea"
status: done
created_date: '2026-10-31'
updated_date: '2026-11-02'
labels:
  - "mcp"
  - "gatekeeper"
  - "quality"
  - "guardrails"
  - "ai-agents"
dependencies:
  - "DEV-353"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Conectar el motor de auditoria y diagnostico (`DEV-353`) al servidor MCP (`bin/gripm-mcp.js` y `scripts/mcp-server.ts`), otorgando a los agentes de IA (Cursor, Claude Code, Antigravity) visibilidad de la salud del repositorio e incorporando salvaguardas arquitectonicas opcionales en el Gatekeeper de certificacion.

### Capacidades MCP:
1. **Nueva Herramienta MCP `gripm_get_repo_health`:**
   - Permite a los agentes consultar en cualquier momento la puntuacion de salud, los archivos cercanos al limite de lineas (>500 LOC), las supresiones detectadas y los tests configurados.
   - Argumentos opcionales: `{ category: 'all' | 'loc' | 'suppressions' | 'tests', limit: number }`.
   - Permite a los agentes evaluar el impacto de su trabajo antes de proponer cambios o solicitar certificacion.

2. **Guardrails Arquitectonicos en el Gatekeeper (`gripm_update_task`):**
   - Cuando un agente intenta transicionar una tarea a estado `ready`:
     - El Gatekeeper valida los criterios de aceptacion tildados y el exit code de `verifyCommand` (como hace actualmente).
     - **Guardrail de Modularidad Opt-in:** Si `.gripm/config.json` tiene activada la gobernanza estricta (`guardrails.enforceLocCeiling: true`), el gatekeeper verifica que ningun archivo tocado en el changeset supere el techo rigido de 1000 LOC.
     - En caso de incumplimiento, rechaza la transicion con un mensaje descriptivo orientando al agente a modularizar antes de entregar.
   - **Preservacion de la Soberania del PO:** El parametro `force: true` permite anular el bloqueo mecánico si el usuario humano asi lo autoriza expresamente, emitiendo un registro de advertencia en los logs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El servidor MCP registra la herramienta gripm_get_repo_health en su lista de herramientas expuestas via stdio.
- [x] #2 La invocacion de gripm_get_repo_health retorna el diagnostico estructurado segun los parametros de categoria solicitados.
- [x] #3 La herramienta gripm_update_task evalua los guardrails configurados al transicionar una tarea a estado ready.
- [x] #4 Si enforceLocCeiling esta activo y se detectan archivos que superan 1000 LOC en el diff, la transicion a ready es rechazada con mensaje explicativo.
- [x] #5 La bandera force: true permite a un usuario humano sortear la restriccion preservando la trazabilidad en la respuesta MCP.
- [x] #6 En proyectos con configuracion estandar o minimalista (sin guardrails estrictos), el Gatekeeper conserva su comportamiento actual sin bloqueos adicionales.
- [x] #7 La suite de pruebas del binario MCP (scripts/verify-mcp-binary.js y tests de integracion) aprueba con codigo de salida 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extender el esquema de herramientas en `scripts/mcp-server.ts` agregando la definicion formal de `gripm_get_repo_health`.
2. Implementar el handler de ejecucion conectando con `auditService.ts`.
3. Integrar la verificacion de guardrails dentro del validador de transicion a `ready` en `gripm_update_task`.
4. Validar el protocolo de comunicacion stdio y compatibilidad de argumentos.
5. Ejecutar la suite completa de tests de MCP y la Piramide de Verificacion.
<!-- SECTION:PLAN:END -->
