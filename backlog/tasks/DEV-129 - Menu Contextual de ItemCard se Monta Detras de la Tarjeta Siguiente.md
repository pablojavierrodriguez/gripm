---
id: DEV-129
title: "Menú Contextual de ItemCard se Monta Detrás de la Tarjeta Siguiente"
status: done
created_date: '2026-09-29'
updated_date: '2026-10-02 23:43'
labels:
  - "bug"
  - "ui"
  - "stacking-context"
  - "itemcard"
  - "kanban"
  - "devboard-core"
dependencies: []
priority: medium
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
order: "29"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El menú contextual que aparece al tocar los 3 puntos de una tarjeta (`ItemCard`)
queda **por detrás de la tarjeta siguiente** de la columna. Es intermitente:
depende de la posición de la tarjeta en la columna y del estado de hover del mouse
al abrirlo.

**Causa raíz: un stacking context no intencionado creado por el hover.**

`src/index.css:166` y `:178` aplican un transform al hacer hover de la tarjeta:

```css
html.dark .glass-card:hover  { transform: translateY(-1px); ... }
html:not(.dark) .glass-card:hover { transform: translateY(-1px); ... }
```

Un `transform` computado es uno de los factores que **crean un stacking context**
en CSS. El elemento raíz de la tarjeta es `position: relative`, así que, al
hoverar, la tarjeta pasa de ser un simple descendiente posicionado a ser **su
propio contexto de apilamiento** con `z-index: auto`.

Según el orden de pintado de CSS 2.1 (Apéndice E), todos los descendientes
posicionados con `z-index: auto` se pintan en el mismo paso (paso 8) **en orden de
documento**. El menú, con `position: absolute; z-index: 40` (`ItemCard.tsx:308`),
sólo puede superar a los hermanos si **no hay un stacking context entre él y la
columna**: en ese caso sube al paso 9 (z-index positivo) y gana contra todas las
tarjetas. Pero al hoverear la tarjeta, ese contexto intermedio aparece y el menú
queda **atrapado dentro de la caja de la tarjeta**, pintado en la posición del
documento de la tarjeta. La tarjeta siguiente, que viene después en el DOM, se
pinta encima.

Por eso el síntoma es intermitente y no constante: el bug se manifiesta cuando la
tarjeta está hovereada, que es precisamente el estado natural al abrir el menú
desde el botón, y cuando existe una tarjeta siguiente que lo tape.

**Problema secundario, de la misma familia**: la lista de tarjetas de cada columna
tiene `overflow-y-auto` (`KanbanBoard.tsx:759`). Aunque el stacking se arreglara
con un z-index más alto, un menú `absolute` seguiría **recortado** por los bordes
del contenedor con scroll, especialmente en la última tarjeta de una columna.

**Por qué subir el z-index no resuelve nada**: `z-40` ya es mayor que cualquier
z-index de las tarjetas (que son `auto`). El problema no es la magnitud del
z-index, es que el menú está **encerrado** en un stacking context que no puede
escapar. Subirlo a `z-[9999]` no cambia absolutamente nada.

> [!NOTE]
> **El mismo `transform` produce un segundo bug, distinto**: además del stacking
> context, un `transform` computado convierte al ancestro en *containing block*
> para sus descendientes `position: fixed`. Eso rompía el `ConfirmModal` que
> `ItemCard` renderiza inline dentro de la tarjeta, y se corrigió aparte en
> **DEV-130**. La moraleja: un `transform` en hover es un generador de bugs
> silenciosos y hay que auditar los dos efectos por separado, porque se
> manifiestan con síntomas opuestos — "quedó atrás" frente a "se dibuja en el
> lugar equivocado".

**Solución: portal a `document.body` con posicionamiento `fixed`.** Es el patrón
que el propio proyecto ya usa en `ReleaseAssembler.tsx:636` y `:1063` con
`createPortal`. El menú se renderiza fuera del árbol de la tarjeta, positioned
con coordenadas calculadas desde el `getBoundingClientRect()` del disparador, y
con `z-index` por encima de toda la app. Así escapa tanto del stacking context
como del recorte del `overflow`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El menú contextual de `ItemCard` se renderiza en un portal sobre `document.body` en lugar de dentro de la tarjeta
- [x] #2 El menú se posiciona con `position: fixed` usando el `getBoundingClientRect()` del botón disparador, manteniendo la alineación a la derecha que tenía con `right-0`
- [x] #3 El menú queda por encima de todas las tarjetas, de la columna y del `sticky header` en ambos temas (claro y oscuro)
- [x] #4 Si no hay espacio suficiente debajo del disparador, el menú se abre hacia arriba en lugar de desbordarse por el borde inferior de la ventana
- [x] #5 El menú se reposiciona al hacer scroll (incluyendo el scroll interno de las columnas del Kanban) y al redimensionar la ventana, en lugar de quedar anclado a una posición obsoleta
- [x] #6 El submenú anidado "Cambiar estado" sigue funcionando y se posiciona correctamente respecto al menú padre ahora que el menú vive en un portal
- [x] #7 El clic dentro del menú portaleado no dispara el `onClick` de la tarjeta (no debe abrir el `ItemModal` al elegir una opción del menú)
- [x] #8 El clic fuera sigue cerrando el menú, contemplando tanto el disparador como el panel portaleado (el `contains()` sobre el ref de la tarjeta ya no alcanza para el menú)
- [x] #9 El menú no queda recortado por el `overflow-y-auto` de la columna en la última tarjeta de una columna
- [x] #10 `npx tsc --noEmit` finishes con código 0
- [x] #11 `npm test` finishes con código 0
- [x] #12 `npm run backlog:check` finishes con código 0
- [x] #13 Validación visual en navegador: abrir el menú de una tarjeta que tenga al menos una tarjeta debajo, en tema claro y oscuro — **VERIFICADO POR EL USUARIO** ("ahí puedo ver el menu ok")
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Importar `createPortal` de `react-dom` y `useLayoutEffect`/`useCallback` en
   `ItemCard.tsx`.
2. Agregar un ref dedicado al panel del menú, separado de `menuRef` (que pasa a
   cubrir solo el disparador) y actualizar el handler de clic externo para
   consultar ambos.
3. Calcular la posición en un `useLayoutEffect` que corre al abrir el menú:
   alinear a la derecha desde el rect del disparador, aplicar el flip hacia arriba
   si no hay espacio y clampear horizontalmente contra los bordes de la ventana.
4. Registrar listeners de `scroll` (con `capture: true`, para pescar el scroll de
   las columnas) y `resize` mientras el menú esté abierto, y limpiarlos al cerrar.
5. Extraer el marcado del menú a un portal con `position: fixed`, `stopPropagation`
   en su raíz, y un `z-index` por encima del header sticky.
6. Regresión: TypeScript, tests, `backlog:check` y validación visual.

**Nota de implementación sobre el posicionamiento en dos pasadas**: el cálculo
necesita el alto real del panel para decidir si se abre hacia abajo o hacia
arriba, pero el panel no existe hasta que hay coordenadas que darle. Se resuelve
con dos `useLayoutEffect`: la primera pasada coloca el menú con la posición por
defecto (abajo, alineado a la derecha, clampeado contra los bordes), y una
segunda pasada, disparada cuando `menuPos` ya tiene valor, mide el panel montado y
corrige la coordenada vertical. Para que esa segunda pasada no entre en loop,
`setMenuPos` usa actualización funcional y devuelve **la misma referencia** cuando
las coordenadas no cambian, lo que hace que React descarte el re-render.
<!-- SECTION:PLAN:END -->
