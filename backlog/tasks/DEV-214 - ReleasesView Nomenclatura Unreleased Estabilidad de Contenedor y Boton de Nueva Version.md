---
releases:
  - "1.0.5"
targetRelease: "1.0.5"
milestone: "1.0.5"
id: DEV-214
title: ReleasesView Nomenclatura Unreleased Estabilidad de Contenedor y Boton de Nueva Version
status: done
priority: p2
type: ux
module: UI / Releases
release: "1.0.5"
created: 2026-10-09
---

## Descripción

Refactor visual y nominal del módulo de Releases:
1. El contenedor de `ReleaseAssembler.tsx` no declaraba ancho estandarizado ni `w-full`, provocando que al seleccionar una pestaña sin versiones (ej. pestaña vacía) la sección entera colapsara a un ancho inferior.
2. La pestaña de versiones en borrador se renombró de 'In preparation' / 'En preparación' al estándar 'Unreleased' / 'No liberadas' (All, Unreleased, Released).
3. Se limpió el texto del botón de creación de versiones para que indique 'New Release' / 'Nueva Versión', eliminando la aclaración redundante '(In Preparation)'.

## Criterios de Aceptación

<!-- AC:BEGIN -->
- [x] 1. En 'ReleaseAssembler.tsx', el contenedor raíz adopta el estándar 'w-full flex-1 p-4 sm:p-6 min-w-0 max-w-[1680px] mx-auto', garantizando un ancho inmutable independientemente de la cantidad de ítems en la vista.
- [x] 2. La pestaña de filtro y chips de estado se actualizan a 'Unreleased' ('No liberadas' en español) en 'en.json', 'es.json' y 'ReleaseAssembler.tsx'.
- [x] 3. El botón de nueva versión se normaliza a 'New Release' / 'Nueva Versión' sin texto redundante de preparación.
<!-- AC:END -->
