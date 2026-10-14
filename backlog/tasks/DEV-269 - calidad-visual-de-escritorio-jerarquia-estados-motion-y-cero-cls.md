---
id: DEV-269
title: "Calidad visual de escritorio: jerarquía, estados, motion y cero CLS a 1366×768"
status: draft
created_date: '2026-10-14'
updated_date: '2026-10-14'
labels:
  - "ux"
  - "ui"
  - "desktop"
  - "design-system"
  - "a11y"
  - "performance"
dependencies:
  - DEV-264
priority: high
type: ux
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Este ítem es **la segunda mitad de DEV-264**, que se dividió porque ampliación de alcance y
ejecutabilidad son cosas distintas: un ítem de 16 criterios no se puede certificar, y un
ítem que no se puede certificar no es un estándar, es una lista de deseos.

La división es por **naturaleza del trabajo**, no por tamaño:

- **DEV-264** (núcleo duro, quick win de escritorio) mide el defecto real, declara el
  presupuesto de densidad, clasifica los 45 `UX-007`, elimina el scroll horizontal de la
  vista por defecto y desbloquea a DEV-265.
- **DEV-269** (este) aplica, sobre el presupuesto ya declarado, los criterios de diseño que
  la skill `worldclass-product-designer` ya define y que hoy **no tienen ninguna auditoría
  que los vuelva obligatorios**.

## Por qué este ítem existe aunque `audit:ux` esté en verde

La auditoría estática marca 45 casos de hacinamiento y ninguno de estos cuatro problemas,
porque no son de layout: son de craft. **Un tablero puede no desbordar y aun así sentirse
amateur.** Eso es exactamente lo que un visitante de la demo pública percibe sin poder
nombrarlo.

Los cuatro ejes que aquí se atacan:

### 1. Jerarquía visual y tipografía

Hoy conviven escala cerrada y `text-[Npx]` arbitrario. Un tamaño arbitrario es deuda:
promueve el valor a token o a la escala. Además:

- **Cifras tabulares** (`tabular-nums` o token monoespaciado de datos) en toda columna
  numérica y en todo valor que cambia en vivo. Sin esto los dígitos bailan y el tablero
  "tembla" en cada mutación — el efecto se percibe como lentitud aunque el cálculo sea
  instantáneo.
- Tokens semánticos (`primary`, `accent`, `muted-foreground`) para que el tema cambie sin
  tocar componentes, y **sin hex hardcodeado** en las superficies de escritorio.
- Contraste que se sostenga en **ambos temas**: sin grises muertos, sin texto que solo se
  lea en dark.
- Tracking fino en mayúsculas pequeñas para etiquetas; nunca mayúsculas en párrafos.

### 2. Estados completos

Todo componente interactivo interactivo define sus siete estados explícitamente: default,
hover (solo con puntero), active/focus (**focus ring siempre visible**), disabled (con
motivo comunicado, no solo atenuado), loading (skeleton o spinner según latencia), empty y
error (qué pasó + qué hacer + si es recuperable).

El alcance son las superficies que **definen el escritorio**: `ItemCard`, `ItemModal`,
`Header`, barra de filtros, `Toast` y vistas.

El **estado cero** es el que más se subestima: ante 0 registros no se emite alerta ni color
de error. Un estado vacío es un estado **válido** — se comunica con serenidad y ofrece el
siguiente paso. "No hay nada" es el antipatrón.

### 3. Feedback y motion con propósito

- **Respuesta en el mismo frame** a toda acción (`active:scale-[0.98]`, cambio de fondo).
- Transiciones de **150–250ms** para cambio de estado; más largas solo para entrada y salida
  de superficies.
- Entrada de sheets y modales con curvas que comuniquen origen. Nada de animación decorativa
  que retrase la respuesta.
- `prefers-reduced-motion` respetado: eso es accesibilidad, no un extra.

### 4. Cero CLS

`html` conserva `overflow-y: scroll` y `scrollbar-gutter: stable` (AGENTS.md §6.10), y el
presupuesto de densidad de DEV-264 evita que aparezca un scrollbar que cambie el ancho
disponible y desplace todo lo que hay a la derecha. El criterio se verifica en las cinco
transiciones que hoy no están medidas: carga inicial, cambio de idioma, cambio de filtro,
cambio de vista y movimiento de una tarjeta entre columnas.

## Dependencia dura de DEV-264

Este ítem **no arranca antes de que DEV-264 cierre**. El presupuesto de densidad y la
clasificación de `UX-007` son la línea de base: sin ellos no hay forma de saber si un
cambio de jerarquía mejoró o solo movió el problema. Y DEV-264 es a su vez lo que
desbloquea a DEV-265, de modo que el orden DEV-264 → DEV-269 → DEV-265 serializa el
trabajo de UI de escritorio.

## Fuera de alcance

- **Diseño móvil.** Es DEV-207. Acá el móvil es una condición que no debe empeorar.
- **Reescribir el design system.** Se tokenizan los valores de las superficies de
  escritorio; no se migra el sistema entero.
- **Nuevas funcionalidades de producto.** El criterio es que lo que existe se vea y se
  comporte bien.
- **Hacinamiento horizontal**, que es DEV-264. Aquí se toca solo el consumo de espacio de lo
  ya resuelto.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Escala tipográfica cerrada en las superficies de escritorio: cero `text-[Npx]` arbitrario en `ItemCard`, `ItemModal`, `Header`, barra de filtros y vistas; todo valor nuevo es token o valor de la escala
- [ ] #2 Cifras tabulares en toda columna numérica y en todo valor que cambia en vivo, sin salto de dígitos al actualizar el tablero
- [ ] #3 Tokens semánticos en lugar de hex hardcodeado en las superficies tocadas, con el tema cambiando sin editar componentes
- [ ] #4 Contraste suficiente en **ambos temas** sobre las superficies principales: sin grises muertos ni texto que solo se lea en dark
- [ ] #5 Tracking fino en mayúsculas pequeñas para etiquetas y ninguna mayúscula en párrafo en las superficies tocadas
- [ ] #6 Los siete estados (default, hover, active/focus, disabled, loading, empty, error) definidos y resueltos en `ItemCard`, `ItemModal`, `Header`, barra de filtros, `Toast` y vistas
- [ ] #7 El estado vacío es sereno y ofrece el siguiente paso; **cero** estados vacíos que usen alerta, color de error o el texto "no hay nada"
- [ ] #8 Focus ring siempre visible para navegación por teclado en toda acción interactiva de escritorio, con `disabled` recordando el motivo
- [ ] #9 Respuesta en el mismo frame a toda acción interactiva (`active:scale-[0.98]` o cambio de fondo equivalente)
- [ ] #10 Transiciones de 150–250ms para cambio de estado, más largas solo para entrada/salida de superficies, y `prefers-reduced-motion` respetado
- [ ] #11 Cero CLS a 1366×768 en las cinco transiciones: carga inicial, cambio de idioma, cambio de filtro, cambio de vista y movimiento de tarjeta entre columnas
- [ ] #12 Ninguna de las correcciones reintroduce scroll horizontal ni desborde: se reverifica el presupuesto de densidad de DEV-264
- [ ] #13 Verificado en ambos idiomas, sin literales sueltos fuera de `es.json` / `en.json`
- [ ] #14 `npm run audit:ux` en verde **sin regenerar el baseline a ciegas**, `npx tsc --noEmit` con 0 errores, `npm test` con 17/17, `npm run test:ui` en verde y `npm run backlog:check` con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Origen:** la ampliación del alcance de DEV-264. Al duplicar el número de criterios se
  decidió partirlo en dos ítems linked por dependencia dura, en lugar de dejar uno solo
  con 16 ACs.
- **El criterio no es nuevo.** Los cuatro ejes son la skill `worldclass-product-designer`
  aplicada a escritorio: §2 (jerarquía visual y tipografía), §3 (micro-interacciones y
  motion), §4 (ergonomía táctil, parcialmente: focus y targets) y §6 (estados). La skill
  ya los declara; lo que faltaba era una auditoría que los vuelva obligatorios.
- **Por qué `high` y no `medium`.** Sigue al `high` de DEV-264: es su continuación y el
  README promete escritorio. Pero a diferencia de DEV-264, acá el defecto **no es visible
  como defecto**: se manifiesta como falta de calidad percibida, que es más difícil de
  defender y más fácil de posponer. El riesgo de que quede en `draft` indefinidamente es
  real.
- **El eje 4 es el que más riesgo de regresión tiene.** Meter `tabular-nums` o tocar
  `scrollbar-gutter` afecta la geometría de todo el tablero. Por eso el AC #12 revalida el
  presupuesto de densidad de DEV-264 en vez de darlo por vigente.
<!-- SECTION:NOTES:END -->