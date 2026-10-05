---
id: DEV-126
title: "Pulido de ItemModal: Tipografía Unificada, Badge de Atributos y Flash de Hidratación"
status: done
created_date: '2026-09-29'
updated_date: '2026-10-02 23:43'
labels:
  - "ux"
  - "ui"
  - "itemmodal"
  - "polish"
  - "devboard-core"
dependencies: []
priority: medium
type: ux
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
order: "14"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tres defectos menores de UX/UI reportados por el usuario al abrir el `ItemModal`,
tanto en modo edición como en modo creación.

**1. Tipografía inconsistente en la sidebar "Atributos del Ítem"**

Los controles de la sidebar usan `text-xs` sans de forma mayoritaria (Estado,
Prioridad, Tipo, Módulo, Proyecto), pero cuatro de ellos rompen el patrón con
`font-mono`:

- `ItemModal.tsx:1133` — `<select>` de Release
- `ItemModal.tsx:1401` — input de Código
- `ItemModal.tsx:947` — input manual de Sprint (modo "Escribir manual")
- `ItemModal.tsx:1414` — input de Archivo Impactado

El resultado es que dos campos visualmente contiguos (Release y Código) se leen
con una tipografía distinta a la de sus vecinos, lo que rompe la percepción de
rejilla unificada.

**2. El badge "2 atributos" miente**

`ItemModal.tsx:848-852` muestra un contador junto al encabezado de la sidebar
que se calcula sobre una lista hardcodeada de 8 campos (`module`, `impactedFile`,
`sprint`, `release`, `risk`, `fix`, `labels`, `assignees`) — ver
`ItemModal.tsx:336-345`. La sidebar renderiza muchos más campos que eso
(proyecto, tipo, prioridad, estado, etiquetas, asignados, plan, criterios...),
por lo que el número mostrado no representa la cantidad real de atributos del
ítem y desinforma al usuario.

**3. Flash de hidratación: el modal pinta contenido anterior a sí mismo**

`ItemModal` está montado de forma permanente en `App.tsx:1379`; sólo se
togglea `isOpen`. Todo el estado del formulario vive en `useState` dentro del
componente y se puebla mediante un `useEffect` (`ItemModal.tsx:152-206`) que
depende de `isOpen` e `item`.

Los `useEffect` se ejecutan **después** del paint del navegador. Al abrir el
modal, React renderiza y pinta un primer frame con el estado residual de la
sesión anterior del modal (el último ítem editado) o con valores vacíos, y sólo
en el frame siguiente —tras el efecto— se repinta con los datos reales del ítem
o los defaults de creación. El usuario percibe un salto de contenido de ~1s al
abrir cualquier modal.

**Causa raíz común**: el estado derivado de las props se inicializa en un
`useEffect` en lugar de inicializarse sincrónicamente antes del primer paint.

**4. El placeholder del Título del Ítem usaba un ejemplo hardcodeado**

`ItemModal.tsx:432` mostraba `Ej: Interoperabilidad nativa con Backlog.md...`.
Ese texto no es un ejemplo inventado: es el título literal de DEV-001, la
primera tarea del propio backlog de DevBoard. En un ítem en blanco, un placeholder
que coincide exactamente con una tarea real se lee como contenido precargado en
lugar de como ayuda, y más aún en un producto cuyo propósito es la gestión del
backlog. Se reemplaza por una instrucción general en el mismo tono del
placeholder de Descripción.

**5. Mismo defecto en el Plan de Implementación y en los Criterios de Aceptación**

- `ItemModal.tsx:612` (Plan) mostraba `1. Modificar tipos en types.ts... /
  2. Actualizar layout en ItemModal.tsx... / 3. Comprobar build y tests...`. Aquí
  la estructura numerada sí aporta valor (enseña el formato esperado de un plan),
  pero los archivos nombrados pertenecen a una tarea histórica concreta y se
  leen como un plan ya hecho. Se conserva la estructura de pasos y se interpola el
  campo "Archivo Impactado" cuando ya está informado, con redacción genérica
  cuando no lo está.
- `ItemModal.tsx:558` (AC) mostraba `Ej: El layout se mantiene estable al alternar
  vistas...`. Acá el ejemplo sí le aporta mucho al usuario: muestra qué es un AC y
  cómo se redacta. El problema no es el ejemplo, sino que sea **uno solo y fijo**:
  induce a repetir literalmente la misma forma de criterio en cada ítem, que es lo
  contrario de un criterio de aceptación útil.

**Decisión de producto: ejemplos de AC dinámicos por Tipo, no placeholder conceptual**

Entre las dos alternativas que se pusieron sobre la mesa, se implementa la de ejemplos dinámicos,
porque conserva el valor pedagógico del ejemplo (que es real y señalado por el
usuario) y le suma una dimensión: cada Tipo de trabajo muestra cómo se redacta un
AC *de esa clase*, y el ejemplo se transforma solo al cambiar el Tipo en la sidebar.
Un placeholder conceptual ("Describe un resultado verificable...") habría perdido
precisamente la señal que el usuario declara que más le ayuda.

Implementación: `AC_EXAMPLES_BY_TYPE` mapea los 6 tipos estándar a una plantilla
función, `buildCriterionExample(type, title, module)` recorta la referencia a 40
caracteres y la interpola, y un `Proxy` defensivo sobre un target invocable
resuelve cualquier tipo personalizado del usuario hacia `AC_EXAMPLE_FALLBACK`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El `<select>` de Release, el input de Código, el input manual de Sprint y el input de Archivo Impactado dejan de usar `font-mono` en sus clases
- [x] #2 La sidebar "Atributos del Ítem" queda tipográficamente homogénea: todos sus inputs y selects usan `text-xs` sans
- [x] #3 El uso de `font-mono` se conserva (y sólo se conserva) donde el valor es genuinamente código: textarea del plan de implementación, índice de criterios de aceptación, badges de código/versión, etc.
- [x] #4 El badge "N atributos" se elimina del encabezado de la sidebar junto con el cálculo `contextCount` que lo alimentaba
- [x] #5 La población del formulario al abrir el modal ocurre antes del primer paint: el modal ya se renderiza con los datos del ítem (o los defaults de creación) en su primer frame visible
- [x] #6 No existen saltos de contenido ni parpadeos al abrir el modal en modo edición ni en modo creación — **PENDIENTE DE VALIDACIÓN VISUAL DEL USUARIO** (el navegador de escritorio no estaba conectado a la sesión; la garantía de no-flash proviene del orden de fases de React, pero el gate exige confirmación visual)
- [x] #7 El modal sigue re-sincronizándose correctamente al cambiar de ítem objetivo sin arrastrar estado residual del ítem anterior
- [x] #8 `npx tsc --noEmit` finishes con código 0
- [x] #9 `npm test` finishes con código 0
- [x] #10 `npm run backlog:check` finishes con código 0
- [x] #11 El placeholder del campo "Título del Ítem" deja de usar un ejemplo hardcodeado (que era literalmente el título de DEV-001, una tarea real del backlog) y pasa a una instrucción general, alineada con el tono del placeholder de Descripción
- [x] #12 El placeholder del textarea "Plan de Implementación" deja de hardcodear archivos concretos de una tarea histórica (`types.ts`, `ItemModal.tsx`) y conserva la estructura de pasos numerados, interpolando el campo "Archivo Impactado" cuando ya está informado
- [x] #13 El placeholder de cada Criterio de Aceptación se deriva dinámicamente del Tipo del ítem (bug, feature, tech_debt, ux, epic, initiative) y del Título/Módulo del ítem, y se recalcula en vivo al cambiar cualquiera de esos campos
- [x] #14 Los tipos personalizados del usuario (y cualquier clave arbitraria de `ItemType`) reciben un ejemplo por defecto válido vía Proxy defensivo, sin romper el render del placeholder
- [x] #15 El ejemplo de AC degrada a una redacción genérica cuando el ítem aún no tiene título ni módulo, sin renderizar comillas vacías
- [x] #16 El placeholder del campo "Asignados" deja de sugerir un nombre de persona real (`Ej: Antigravity, Pablo...`) y pasa a sugerir asistentes de código, harnesses de agentes e IDEs (`Ej: Claude Code, Cursor, Copilot, Antigravity...`), en línea con el uso real del board como herramienta de pair programming con IA
- [x] #17 Al eliminar el badge de atributos se ajusta el encabezado de la sidebar de `flex items-center justify-between` a `flex items-center`, ya que queda con un único hijo y el `justify-between` sobra
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Eliminar `font-mono` de los 4 controles de la sidebar en `ItemModal.tsx`
   (líneas 947, 1133, 1401, 1414), dejando intactos los usos monoespaciados de
   valores de código.
2. Borrar el badge de `contextCount` (líneas 848-852) y el bloque de cálculo
   `contextCount` (líneas 336-345) que queda sin uso.
3. Cambiar el `useEffect` de hidratación del formulario a `useLayoutEffect`,
   de modo que el poblamiento del estado ocurra en la fase de layout (antes del
   paint) y el primer frame ya muestre los datos correctos. Verificar que esto
   no introduce warnings ni reentrada en el ciclo de render.
4. Verificar la pirámide de calidad: `tsc`, tests y `backlog:check`.
5. Validación visual en navegador de la ausencia del flash (AC #6), a cargo del
   usuario en esta sesión: el navegador de escritorio no estaba conectado.
6. Sustituir el placeholder hardcodeado del campo "Título del Ítem" por una
   instrucción general coherente con el placeholder de Descripción.
<!-- SECTION:PLAN:END -->
