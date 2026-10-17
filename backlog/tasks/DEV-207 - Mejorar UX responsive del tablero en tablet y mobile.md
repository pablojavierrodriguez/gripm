---
id: DEV-207
title: "Mejorar UX responsive del tablero en tablet y mobile"
status: ideas
created_date: '2026-10-07'
updated_date: '2026-10-07'
labels:
 - "ux"
 - "ui"
 - "responsive"
 - "mobile"
priority: medium
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El tablero está priorizando actualmente el uso en desktop y presenta una experiencia visual apretada en tablet y mobile: controles de filtros densos, textos y estadísticas que compiten por espacio y vistas de trabajo que necesitan una jerarquía específica para pantallas táctiles. Diseñar una experiencia responsive intencional para resoluciones menores, sin limitarse a envolver controles en filas que dejen espacios vacíos o creen barras visualmente fragmentadas.

Este ítem es una **idea a refinar**, no un bug detectado. Requiere un trabajo de análisis, diseño y definición completa de la experiencia antes de poder implementarse; por eso sigue en `ideas` y no en `draft`.
<!-- SECTION:DESCRIPTION:END -->

## Contexto medido (aportado por la auditoría de DEV-222, 2026-10-13)

> [!NOTE]
> Esto **no reemplaza el trabajo de diseño de este ítem**: es evidencia de entrada para que el
> análisis empiece con datos en vez de con intuiciones. El alcance sigue siendo definir la
> experiencia responsive; no es arreglar tres CSS.

Una auditoría con navegador real (Playwright + Chromium) sobre `dist/` servido como
estático, en 360x800, 390x844 y 430x932, encontró que el problema **no es de densidad sino
de reflujo**: el Header no se adapta.

- El contenedor `grid-cols-[1fr_auto_1fr]` deja su cluster derecho **fijo en x 397 - 487**,
  fuera del viewport. El contenido excede en **127px**.
- El desborde **no se manifiesta como scroll** porque un ancestro con `overflow-x: hidden`
  lo recorta: `scrollWidth === clientWidth` mientras el contenido es 127px más ancho. Es
  contenido inalcanzable, no una región scrolleable.
- El `nav` arrastra `min-w` de 331px (88+145+98) que desborda y **pinta por encima** de los
  controles que quedan debajo: un tap real sobre el botón de reset de demo navegó a la vista
  Sprints en 6 corridas independientes.
- **9 controles con target táctil < 44px**, medidos con `getBoundingClientRect()`: checkbox
  de AC 13x13, acciones de tarjeta 22x22, "nuevo ítem" de columna 32x32, "Nueva tarea" y
  menú móvil 40x40, tabs del header con 28px de alto, "copiar código" 50x16, y el botón de
  reset de demo 28x44 (el alto se cumplió, el ancho nunca).
- Coincide con los **45 hallazgos UX-007** de hacinamiento horizontal ya aceptados en el
  baseline, repartidos en 16 archivos. Es el mismo problema de raíz.

**Restricción a tener en cuenta al diseñar:** desde DEV-222 existe un **adaptador de datos
en memoria** (`src/data/sandbox.ts`) detrás de un contrato explícito
(`src/data/types.ts`), con un detector de entorno que degrada a ese adaptador cuando no hay
daemon. El trabajo responsive tiene que apoyarse en esa capa en vez de asumir una vista
local con API. La demo web es el caso de uso para el que hoy **no** está optimizada, y
publicarla como experiencia desktop es una decisión consciente hasta que este ítem cierre.

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Definir y documentar los anchos objetivo y la jerarquía de información para mobile, tablet y desktop
- [ ] #2 Reorganizar filtros, estadísticas y acciones del tablero para evitar hacinamiento y saltos de línea accidentales
- [ ] #3 Validar las vistas Kanban y Backlog en anchos táctiles habituales, incluyendo navegación, acciones y scroll
- [ ] #4 Mantener la experiencia desktop compacta y sin regresiones en resoluciones amplias
- [ ] #5 Verificar ambos idiomas y temas, sin overflow horizontal accidental ni pérdida de controles
<!-- AC:END -->
