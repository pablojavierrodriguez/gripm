---
id: DEV-270
title: "Armonización y simetría visual en selector de navegación del Header (Tabs)"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "ui"
  - "header"
  - "zero-cls"
  - "responsive"
dependencies: []
priority: high
type: ux
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En `src/components/Header.tsx`, los botones del segmented control de vistas (`Tablero`, `Sprints`, `Releases`) poseen dimensiones mínimas dispares y hardcodeadas (`min-w-[88px]`, `min-w-[145px]`, `min-w-[98px]`).

Esta disparidad se introdujo originalmente para prevenir saltos de línea ante textos extensos en español, pero provoca que el control segmentado central del encabezado se perciba visualmente asimétrico, irregular y desbalanceado con respecto a los estándares de diseño de componentes de navegación.

Adicionalmente, en resoluciones compactas de escritorio (1024×768 a 1366×768), la distribución `grid grid-cols-[1fr_auto_1fr]` con `justify-self-center` genera una **colisión crítica**: el bloque izquierdo (selector de proyecto + badge Demo + botón `Reset demo` con texto expandido) excede el tercio asignado y desborda físicamente sobre las pestañas centrales, montando el botón `Reset demo` directamente encima de la pestaña `Board` (Tablero).

### Objetivos:
1. Homogeneizar el ancho y espaciado de los botones del selector de vistas para lograr una barra simétrica y balanceada sin anchos artificiales sobredimensionados (`min-w-[145px]`).
2. Blindar el layout del Header mediante límites de ancho y flexbox/grid responsivo para garantizar cero colisión física entre el bloque de proyecto y la barra central de navegación a cualquier resolución (>= 1024px).
3. Optimizar el botón `Reset demo` del Header: colapsar a icono accesible con tooltip en pantallas compactas (< 1280px / `xl`), e incorporar la acción de reinicio en el banner de demo interactivo de `App.tsx` para máxima usabilidad.
4. Asegurar paridad bilingüe (`en` / `es`) y preservar la estabilidad visual Zero-CLS sin oscilaciones al alternar idiomas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Los botones del segmented control en `Header.tsx` comparten un dimensionamiento armónico y simétrico sin saltos bruscos de ancho entre pestañas (`min-w-[145px]` reemplazado por dimensionamiento equilibrado)
- [x] #2 Las etiquetas visuales en inglés y español no desbordan ni fuerzan anchos desproporcionados
- [x] #3 Se preserva la estabilidad Zero-CLS al alternar entre inglés y español
- [x] #4 Los estados activo, hover y focus ring mantienen coherencia con los tokens de diseño
- [x] #5 Cero solapamiento ni desborde entre la columna izquierda (`singleProject`, `Reset demo`) y las pestañas centrales de navegación en resoluciones de escritorio (1024×768 a 1366×768)
- [x] #6 El botón `Reset demo` en el Header se muestra en modo icon-only con tooltip accesible (`title` y `aria-label`) en resoluciones compactas (< 1280px), expandiendo su texto solo en pantallas amplias (`xl`), y la acción se expone también en el banner de demo de `App.tsx`
- [x] #7 `npm test`, `npm run audit:ux` y `npm run backlog:check` pasan con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Implementación (DEV-270):**
  - Unificados los botones de pestañas en `Header.tsx` a un dimensionamiento simétrico y armónico de `min-w-[92px]`, eliminando la asimetría de `min-w-[145px]`.
  - Grid de Header protegido con `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` para evitar desbordes sobre la columna central.
  - El botón `Reset demo` en Header ahora es responsive: icon-only con `aria-label` y tooltip accesible en pantallas compactas (< 1280px), expandiendo su texto en `xl:inline`.
  - Acción de `Reset demo` incorporada en el banner interactivo de `App.tsx` junto a los enlaces de Source e Install.
  - Search input y FilterBar estilizados con límites responsivos y `tabular-nums` en el bloque de métricas con separador protegido.
  - Toda la Pirámide de Verificación en verde (`npm test` 18/18 pasos, `npm run test:ui` en verde, `npm run audit:ux` 0 errores).
<!-- SECTION:NOTES:END -->
