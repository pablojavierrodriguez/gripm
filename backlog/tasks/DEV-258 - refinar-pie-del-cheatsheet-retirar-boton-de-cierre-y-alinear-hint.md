---
id: DEV-258
title: "Refinamiento del pie del cheatsheet: retirar el botón de cierre redundante y alinear el hint de reapertura"
status: ready
created_date: '2026-10-13'
updated_date: '2026-10-13'
labels:
  - "ux"
  - "accessibility"
  - "shortcuts"
  - "ui"
dependencies:
  - DEV-257
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refinamiento post-release del pie introducido por DEV-257 (que ya se selló y publicó en `v1.3.0`, por lo que esta iteración se registra como ítem nuevo y no como edición de un ítem en `done`).

El pie de `KeyboardShortcutsModal` quedó con un botón "Cerrar" que es una cuarta vía de descarte redundante: el primitivo `Modal` ya ofrece tres, a saber la X del header, la trampa de foco con `Esc` (`useFocusTrap`) y el click en el backdrop. El botón competía por atención con los enlaces de valor real y era el elemento de mayor peso del pie. 

Problemas concretos que corrige:
1. **Redundancia de descarte.** Cuatro elementos cierran el mismo diálogo. Tres son suficientes y las tres restantes son las convencionales (X de header, `Esc`, backdrop). Un cuarto disparador crea ambigüedad sobre cuál es el canónico.
2. **Peso visual y jerarquía.** El botón era el elemento de mayor peso tipográfico del pie (`font-semibold` sobre `bg-slate-200`), es decir, el pie destacaba la acción de salir por encima de la información. Justo lo contrario de un pie informativo.
3. **Ocupación vertical.** El `min-h-[44px]` del botón forzaba `py-3` (68 px de alto). Sin él, el alto lo fija el `min-h-[44px]` de los enlaces y el pie baja a `py-2` (60 px), liberando espacio para el cuerpo del modal en pantallas bajas.
4. **Hint de reapertura inline.** El texto "Presiona ? en cualquier momento para abrir esta guía" pasa a compartir la fila con la marca y los enlaces, en el extremo opuesto (`justify-between`), en lugar de ocupar un bloque propio. Por debajo de `sm` se oculta, de modo que en móvil la fila queda en una sola línea con `marca + enlaces`.
5. **Corte duro de scroll (hallazgo de verificación visual).** Al retirar el botón y bajar el pie, el borde inferior del cuerpo scrolleable quedó pegado a la línea del pie. Cuando un header de sección caía justo sobre ese borde se leía como texto pisado o partido. No era solapamiento real —el pie nunca puede superponerse porque el cuerpo scrollea—, sino un corte abrupto que se resuelve con un `mask-image` degradado en los últimos 28 px más `pb-7` de aire.

Fuera de alcance: cualquier cambio en la X del header, en el primitivo `Modal` o en la semántica de la trampa de foco.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El pie de `KeyboardShortcutsModal` no renderiza ningún botón de cierre
- [x] #2 El diálogo sigue siendo descartable por la X del header, por `Esc` y por click en el backdrop, verificado sobre el primitivo `Modal` (`onClick={onClose}` en el backdrop) y `useFocusTrap` (`event.key === 'Escape'`), con el paso `focus-trap` de la suite en verde
- [x] #3 El hint de reapertura se renderiza en la misma fila que la marca y los enlaces, alineado al extremo derecho por `justify-between`, y permanece oculto por debajo de `sm` (UX-002: el `<kbd>` conserva `hidden sm:inline-flex` en su propia línea porque el auditor es de matching por línea)
- [x] #4 El pie pasa de `py-3` a `py-2` y el alto resultante queda determinado por el `min-h-[44px]` de los enlaces; `npm run audit:ux --rule UX-009` reporta 0 findings
- [x] #5 `npx tsc --noEmit` reporta 0 errores
- [x] #6 Pirámide de verificación en verde: `npm test` (16/16 pasos), `npm run audit:ux` (0 errores, 0 sugerencias; las 12 advertencias son los falsos positivos documentados de UX-010), `npm run backlog:sync` && `npm run backlog:check`, `npm run publish:check`, `npm run build` y `node scripts/verify-changes.js --all` (414 archivos)
- [x] #7 El cuerpo scrolleable no corta contenido en seco contra la línea del pie: aplica `mask-image` con degradado en los últimos 28 px más `pb-7` de aire, de modo que un header de sección que caiga sobre el borde de scroll se disuelva en el pie y se lea como "hay más abajo" en lugar de texto pisado
<!-- AC:END -->