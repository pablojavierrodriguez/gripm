---
id: DEV-224
title: "Execution Gatekeeper en el servidor MCP para verificación objetiva de tareas"
status: done
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "mcp"
  - "gatekeeper"
  - "qa"
  - "verification"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Transformar el servidor MCP de Gripm de un gestor de datos pasivo a un sistema activo de supervisión y arbitraje de calidad para agentes de IA:
1. **Compuerta estricta de Criterios de Aceptación:** Cuando un LLM intente avanzar el estado de una tarea a `ready` (entrega formal de desarrollo) o `done`, la herramienta `gripm_update_task` debe validar que el 100% de los criterios de aceptación estén tildados (`- [x]`), rechazando la mutación en caso contrario.
2. **Ejecución de comandos de verificación asociados:** Soporte opcional para asociar comandos de validación en la tarea (por ejemplo, `verifyCommand: npm test` en frontmatter), ejecutándolos en un subproceso antes de aceptar el cambio de estado.
3. **Mensajes de error determinísticos:** En caso de rechazo, el servidor MCP debe retornar una respuesta clara y estructurada que detalle exactamente qué criterio o test falló y qué acción correctiva debe ejecutar el agente antes de reintentar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 gripm_update_task rechaza la transicion a ready o done si existen criterios de aceptacion pendientes de marcar
- [x] #2 Soporte para asociar comandos de verificacion ejecutables en la tarea antes de aceptar la certificacion
- [x] #3 Mensajes de error deterministicos en la respuesta MCP que explican con claridad al agente la falla y como resolverla
- [x] #4 npm test y npx tsc --noEmit pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Mantener alineación con los guardrails de AGENTS.md: el estado terminal del agente de desarrollo es `ready`, mientras que `done` corresponde al PO / Release Management.
<!-- SECTION:NOTES:END -->
