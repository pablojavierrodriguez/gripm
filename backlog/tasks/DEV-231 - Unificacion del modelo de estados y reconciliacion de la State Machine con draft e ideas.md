---
id: DEV-231
title: "Unificación del modelo de estados y taxonomía del Delivery Flow (draft a done)"
status: done
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "state-machine"
  - "backlog"
  - "playbook"
  - "governance"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reconciliar y armonizar el modelo de estados del proyecto y el playbook (`STATE_MACHINE.md`, `AGENTS.md`, `TEAM_PLAYBOOK.md` y `gripm` core), erradicando ambigüedades y errores no forzados en los extremos del flujo:
1. **Entrada al flujo (Backlog no es estado, las tareas nacen en draft):** Establecer formalmente que el "Backlog" es el contenedor / dimensión de planificación (el inventario de trabajo no iniciado), NO un valor de estado. Los ítems del Backlog nacen de forma legítima con el estado `draft` (o `ideas` para descubrimiento). Erradicar la noción confusa de "ítems sin estado".
2. **Salida del desarrollo (ready es la meta de dev, done es exclusivo del release):** Clarificar que `ready` es la entrega formal de desarrollo (código implementado, probado y certificado). Marcar `done` antes del deploy/release es una mentira de estado que rompe el Release Assembler de Gripm. El paso a `done` lo realiza el empaquetado de release.
3. **Flujo de vida completo y unificado:**
   - **Discovery / Pool:** `ideas`
   - **Backlog (definida / en especificación):** `draft`
   - **Flujo activo de desarrollo:** `doing` ➔ `review` ➔ `ready` (línea final del dev/agente)
   - **Producción / Despliegue:** `done` (asignado al sellar/desplegar el release)
   - **Salidas fuera de flujo:** `dismissed`, `cancelled`
4. **Sincronización documental bidireccional:** Actualizar `STATE_MACHINE.md` en gripm-playbook y las referencias en `AGENTS.md` de ambos repositorios para que reflejen esta taxonomía clara, unívoca y sin fricciones.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 STATE_MACHINE.md en gripm-playbook reconoce explicitamente a draft como el estado formal del backlog e ideas como discovery
- [x] #2 Se erradica la regla ambigua de "items sin estado" preservando status: draft como valor canonico al crear tareas
- [x] #3 Documentacion explicita que fija a ready como la meta terminal del desarrollador/agente y a done como evento de release/deploy
- [x] #4 AGENTS.md en gripm y gripm-playbook reflejan con precision el flujo completo sin ambiguedades
- [x] #5 Coherencia 100% entre src/types.ts, src/utils/statusMeta.ts, ReleaseAssembler y las reglas de gobernanza
- [x] #6 npm run backlog:check y npm test pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Invariante Fundamental: "No puede haber un ítem en producción que no esté en done, ni un ítem en done que no esté en producción".
- Preservar la separación estricta: el Backlog no es un Sprint ni un valor de estado suelto.
<!-- SECTION:NOTES:END -->
