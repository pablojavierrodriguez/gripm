---
id: DEV-328
title: "Quick add en lenguaje natural para tareas"
status: ideas
created_date: '2026-10-22'
updated_date: '2026-10-22'
labels:
  - "product"
  - "ux"
  - "cli"
  - "ai"
priority: medium
type: feature
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Crear una tarea hoy exige abrir el modal y completar campos a mano. OpenTodo ofrece captura en lenguaje natural ("fix login friday p1") que interpreta fecha, prioridad y proyecto. gripm puede ofrecer lo mismo con un parser propio y determinístico, sin llamadas a LLM y sin salir de la máquina, manteniendo la esencia local-first.

La captura debe mapear a campos ya existentes del frontmatter: `title`, `dueDate`, `priority`, `type` y `labels`. La interpretación debe ser conservadora: si un fragmento no se reconoce con certeza, va al título completo en lugar de inventar metadatos. El resultado debe ser una tarea normal que pasa por `backlog:sync` y el gatekeeper del MCP igual que cualquier otra.

Es una iniciativa de descubrimiento: evaluar si el parser se resuelve en el modal del board, en el CLI o como función compartida por ambos, antes de decidir dónde se implementa.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Se define y documenta la sintaxis soportada (fecha, prioridad, tipo, etiquetas) con ejemplos y contraejemplos.
- [ ] #2 La interpretación es determinística y sin red: los fragmentos no reconocidos se conservan literalmente en el título.
- [ ] #3 Las tareas creadas por quick add son indistinguibles de las creadas por el modal en frontmatter y en `backlog:sync`.
- [ ] #4 Existe al menos un test que cubra la interpretación de fechas y prioridades, incluido el caso ambiguo.
- [ ] #5 El quick add no permite saltar el gatekeeper ni crear estados prohibidos por el MCP.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventariar los tokens de fecha, prioridad y tipo ya soportados por el dominio.
2. Prototipar el parser como función pura con tabla de casos de prueba.
3. Decidir la superficie de consumo (modal, CLI o ambas) según el resultado del prototipo.
4. Integrar, testear y documentar la sintaxis en el README.
<!-- SECTION:PLAN:END -->
