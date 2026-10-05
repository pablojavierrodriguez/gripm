---
id: DEV-128
title: "Regla de Trazabilidad Total y Auditoría de Alcance del Feedback en Caliente"
status: done
created_date: '2026-09-29'
updated_date: '2026-10-02 23:43'
labels:
  - "process"
  - "governance"
  - "dogfooding"
  - "devboard-core"
dependencies: []
priority: medium
type: ux
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
order: "28"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Durante la sesión de pulido de `ItemModal` (DEV-126) y de corrección de la
inyección de contenido en los `.md` (DEV-127), el usuario señaló un defecto de
proceso: **cualquier extensión del alcance de una tarea en curso debe quedar
registrada en esa tarea o en una nueva**, incluso cuando el cambio se atiende
"de paso" como respuesta a un feedback en caliente.

La regla que ya existía en `AGENTS.md` ("los refinements UX van al tope de la
cola") ordenaba **atender** el feedback rápido, pero no exigía **registrarlo**.
Esa asimetría es exactamente la que abre la fuga: el agente hace el cambio,
considera que es "parte" de un AC vecino, y no deja rastro. Para quien lea el
historial del proyecto después, un cambio de código sin AC es indistinguible de
un cambio accidental, y ambos cuestan lo mismo de revertir.

**Auditoría aplicada a la sesión en curso.** Se contrastó `git diff --stat` contra
la lista de ACs de DEV-126 y DEV-127 y se encontraron **dos cambios sin AC**:

1. El placeholder del campo "Asignados" de `ItemModal.tsx` pasó de
   `Ej: Antigravity, Pablo...` a `Ej: Claude Code, Cursor, Copilot, Antigravity...`
   a pedido explícito del usuario. El cambio estaba hecho y verificado, pero
   nunca se registró.
2. Al eliminar el badge de atributos se ajustó el encabezado de la sidebar de
   `flex items-center justify-between` a `flex items-center` (el `justify-between`
   quedó huérfano al quedar un solo hijo). Un one-liner de CSS sin registro.

Ambos quedaron regularizados como ACs #16 y #17 de DEV-126.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `AGENTS.md` incorpora una regla explícita de trazabilidad total: todo cambio de código, incluidos los refinamientos en caliente, debe quedar registrado como AC de la tarea en curso o como tarea nueva
- [x] #2 La regla enumera los casos que irresistiblemente se hacen "de paso" sin registro (cambiar un placeholder, regenerar un bundle versionado, ajustar clases de layout huérfanas), porque son los que más se escapan
- [x] #3 La regla define un protocolo de cierre verificable: contrastar `git diff --stat` contra los ACs de la tarea antes de darla por terminada
- [x] #4 Se audita la sesión en curso y se regulariza el placeholder de "Asignados" como AC #16 de DEV-126
- [x] #5 Se audita la sesión en curso y se regulariza el ajuste de layout del encabezado de la sidebar como AC #17 de DEV-126
- [x] #6 Se confirma que el resto de los cambios de la sesión ya tenían respaldo: `bin/devboard-mcp.js` (DEV-127 #6), `package.json` (DEV-127 #7), `scripts/backlogMdParser.ts` (DEV-127 #1..#4), `scripts/test-parser.js` (DEV-127 #14), `src/components/PlanGuardModal.tsx` (DEV-127 #16..#18)
- [x] #7 La propia tarea que introduce la regla queda registrada, para que la regla no arranque con una excepción propia
- [x] #8 `npm run backlog:check` finishes con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reescribir la sección de refinements en `AGENTS.md` agregando la regla de
   trazabilidad total como bloque de advertencia propio.
2. Enumerar los patrones de cambio que se hacen sin registro, con ejemplos
   concretos del propio repo.
3. Definir el protocolo de cierre: `git diff --stat` contrastado contra los ACs.
4. Auditar los cambios de la sesión en curso y registrar los huecos encontrados.
5. Verificar la pirámide de calidad y sincronizar el backlog.
<!-- SECTION:PLAN:END -->
