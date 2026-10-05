---
id: DEV-131
title: "Definición del Goal de Sprint 7 y Ampliación de Alcance del Sprint en Curso"
status: done
created_date: '2026-09-29'
updated_date: '2026-10-02 23:43'
labels:
  - "process"
  - "governance"
  - "sprint"
  - "devboard-core"
dependencies: []
priority: medium
type: tech_debt
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
order: "29"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El usuario señaló —en sarcasmo, y con razón— que **el Sprint 7 se había creado sin
`goal`**, a diferencia de los otros siete sprints del proyecto, que sí lo tienen
definido desde su creación. Es decir: el campo no es opcional en la práctica, se
respeta en todos los casos salvo en este, y su ausencia era un defecto de
definición, no una libertad de alcance.

Un sprint sin goal no pierde sólo una etiqueta: pierde **la única señal que indica
cuándo está terminado**. Sin ella, el criterio de "llenar el sprint" degenera en
"meter lo que aparezca", y el backlog deja de priorizar.

**Goal redacto para Sprint 7**, derivado de lo que el sprint efectivamente es hoy
(12 tareas, 4 en `ready`, 5 en `review`, 2 en `draft`):

> Integridad del dato y corrección de fallos silenciosos: hooks de verificación que
> no mutan el repositorio, paridad de temas, identidad de proyecto, y eliminación
> de los defectos que no fallaban de forma visible (contenido fabricado en los
> `.md`, stacking context y containing block en overlays, y pulido de ItemModal).

El eje común que unifica las 12 tareas es precisamente ese: **ninguno de esos
defectos fallaba de forma visible**. El serializador no fallaba, escribía texto de
más. El Plan Guard no fallaba, no se disparaba nunca. El menú no fallaba, se
tapaba. El `ConfirmModal` no fallaba, se dibujaba en el lugar equivocado y
parpadeaba. Son fallos silenciosos, y esa es la línea que justifica el sprint.

**Ampliación de alcance.** Con el goal definido, el usuario señaló además tareas de bajo
esfuerzo y alto valor que ya existían en el backlog sin asignar. Se incorporan
**DEV-118, DEV-119, DEV-120, DEV-121 y DEV-122** al Sprint 7. **DEV-115 y DEV-101**
ya pertenecían al sprint, por lo que no se reassignan.

**Defecto de formato corregido en DEV-101**: su Implementation Plan tenía los
saltos de línea como la secuencia literal `\n` en vez de saltos reales, lo que se
renderiza como un solo bloque corrido en la UI. Corregido.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Se verifica si el goal vacío de Sprint 7 es un defecto puntual o una costumbre del proyecto, auditando el campo `goal` de los 8 sprints
- [x] #2 Sprint 7 recibe un `goal` que describe su alcance real, en `backlog/sprints.json`
- [x] #3 DEV-118 queda asignada a Sprint 7
- [x] #4 DEV-119 queda asignada a Sprint 7
- [x] #5 DEV-120 queda asignada a Sprint 7
- [x] #6 DEV-121 queda asignada a Sprint 7
- [x] #7 DEV-122 queda asignada a Sprint 7
- [x] #8 DEV-115 y DEV-101 se verifican como ya pertenecientes al sprint (no se reasignan)
- [x] #9 Se revisa la definición de DEV-101 y se corrige el defecto de formato de su plan (saltos de línea literales `\n`)
- [x] #10 Se registra el riesgo de DEV-119 (reescritura de historial git) antes de ejecutarla: es irreversible y afecta a todo el repo
- [x] #11 `npm run backlog:check` finishes con código 0
- [x] #12 Se incorpora en `AGENTS.md` el gate de cierre de sprint: no se cierra con tareas en `draft`, `doing` o `review`, y el agente no debe proponer ni anticipar el cierre de un sprint incompleto
- [x] #13 Se fija el ritmo de trabajo: resolver las tareas de a una y pasar a la siguiente sólo con la confirmación del usuario de que la anterior quedó bien
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Auditar el campo `goal` de los 8 sprints y confirmar que Sprint 7 es el único
   vacío.
2. Redactar el goal de Sprint 7 a partir del contenido real del sprint.
3. Asignar Sprint 7 a DEV-118, DEV-119, DEV-120, DEV-121 y DEV-122, agregçando
   `sprints` y `sprint` al frontmatter de cada archivo de tarea.
4. Verificar que DEV-115 y DEV-101 ya estaban en el sprint.
5. Corregir los saltos de línea literales del plan de DEV-101.
6. Registrar esta tarea (la propia regla de DEV-128 lo exige).
7. Sincronizar y verificar con `backlog:check`.
Es un tarea de ordenamiento interno no un bug o feature del backlog. queda registo de lo realizado.
<!-- SECTION:PLAN:END -->
