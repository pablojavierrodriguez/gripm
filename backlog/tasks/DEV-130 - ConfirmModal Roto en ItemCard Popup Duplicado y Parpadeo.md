---
id: DEV-130
title: "ConfirmModal Roto dentro de ItemCard: Popup Duplicado y Parpadeo por Containing Block"
status: done
created_date: '2026-09-29'
updated_date: '2026-10-02 23:43'
labels:
  - "bug"
  - "ui"
  - "containing-block"
  - "portal"
  - "itemcard"
  - "devboard-core"
dependencies:
  - "DEV-129"
priority: high
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
order: "29"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Al presionar **"Papelera"** en el menú contextual de una tarjeta, el diálogo de
confirmación aparecía **duplicado** y la pantalla empezaba a **parpadear**.

**Síntoma reportado por el usuario**: "el popup apareció duplicado y empezó a
parpadear la pantalla".

**Causa raíz: `position: fixed` resuelto contra la tarjeta en vez del viewport.**

`ItemCard` renderizaba el `ConfirmModal` **inline, dentro de la propia tarjeta**
(`ItemCard.tsx:592-601`), dentro del `<div className="group relative glass-card">`.
Y `src/index.css:166` y `:178` aplican:

```css
html.dark .glass-card:hover       { transform: translateY(-1px); ... }
html:not(.dark) .glass-card:hover { transform: translateY(-1px); ... }
```

Un `transform` computado no sólo crea un stacking context: además convierte al
elemento en **containing block para sus descendientes `position: fixed`**. El
overlay del `ConfirmModal` es `fixed inset-0` (`ConfirmModal.tsx:111`), por lo que
mientras la tarjeta estuviera hovereada pasaba a medirse contra **la caja de la
tarjeta** y no contra el viewport: el fondo oscurecido y el diálogo aparecían
encajados dentro de la tarjeta, no centrados en la pantalla.

**Por eso parpadeaba en vez de simplemente verse feo**: el tamaño y la posición del
diálogo dependían del estado de hover, y el hover dependía de dónde estuviera el
puntero, que a su vez dependía de dónde estuviera el diálogo. Eso cierra un ciclo
de retroalimentación:

1. Puntero sobre la tarjeta → `hover` activo → `transform` aplicado → el modal se
   dibuja **pequeño, dentro de la tarjeta**.
2. El puntero sale de la tarjeta para alcanzar el modal → `hover` se pierde → el
   `transform` desaparece → el `fixed` vuelve a medirse contra el **viewport** → el
   modal **salta** a su tamaño real, centrado.
3. Al volver a mover el puntero sobre la tarjeta, el ciclo se repite.

El "popup duplicado" era el mismo diálogo dibujándose alternadamente en las dos
posiciones, y el parpadeo era el vaivén entre ambas.

**Relación con DEV-129**: es la **misma familia de bug** que el del menú
contextual (stacking context por `transform`), pero con un síntoma distinto porque
aquí el `transform` no afecta el orden de pintado sino el **containing block**.
DEV-129 ya había corregido el primer efecto de este mismo `transform` en el
menú contextual, pero no el segundo: son efectos distintos y no se detectan
con el mismo síntoma.

**Por qué se arregla en `ConfirmModal` y no en `ItemCard`**: `ConfirmModal` tiene 8
consumidores (`ItemCard`, `Header` ×3, `ReleaseAssembler` ×2, `SprintView` ×2,
`TrashView`, `ItemModal`). Todos lo renderizan inline, así que todos son
potencialmente víctimas de la misma trampa de `containing block` en cuanto se
agregue un ancestro con `transform`/`filter`/`backdrop-filter`. Montar el overlay
en un portal sobre `document.body` dentro del propio componente lo hace inmune de
una vez a todos, sin depender de que cada consumidor recuerde la regla.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `ConfirmModal` monta su overlay en un portal sobre `document.body` en lugar de renderizarse inline donde lo consume su ancestro
- [x] #2 El overlay `fixed inset-0` se mide siempre contra el viewport, con independencia de cualquier `transform`, `filter`, `backdrop-filter`, `will-change` u `overflow` de los ancestros
- [x] #3 El diálogo de "Mover a la Papelera" aparece centrado y a tamaño completo, sin parpadeo ni oscilación de posición al mover el puntero
- [x] #4 Los 8 consumidores de `ConfirmModal` quedan corregidos por el cambio (`ItemCard`, `Header` ×3, `ReleaseAssembler` ×2, `SprintView` ×2, `TrashView`, `ItemModal`)
- [x] #5 El clic en el fondo sigue cerrando el modal y el clic dentro del diálogo no lo cierra (`stopPropagation` preservado)
- [x] #6 El atajo de teclado (Esc para cerrar, Enter para confirmar) y el estado de `loading` del botón de confirmación siguen funcionando
- [x] #7 `npx tsc --noEmit` finishes con código 0
- [x] #8 `npm test` finishes con código 0
- [x] #9 `npm run backlog:check` finishes con código 0
- [x] #10 Validación visual: abrir el menú de una tarjeta → Papelera y comprobar que el diálogo aparece centrado, estable y sin parpadeo, en tema claro y oscuro — **PENDIENTE DE VALIDACIÓN VISUAL DEL USUARIO**
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirmar la causa en el código: `ItemCard.tsx:592` renderiza `ConfirmModal`
   inline y `index.css:166/178` aplica `transform` en hover sobre la tarjeta.
2. Envolver el return del overlay en `createPortal(..., document.body)` dentro de
   `ConfirmModal.tsx`, de modo que la corrección cubra a los 8 consumidores.
3. Verificar que los eventos de React siguen propagando correctamente a través
   del portal (el `onClick` del fondo y el `stopPropagation` del diálogo).
4. Regresión: TypeScript, tests, `backlog:check` y validación visual.
<!-- SECTION:PLAN:END -->
