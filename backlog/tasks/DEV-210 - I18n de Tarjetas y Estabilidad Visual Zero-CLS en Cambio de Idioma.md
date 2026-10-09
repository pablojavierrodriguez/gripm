---
releases:
  - "1.0.5"
targetRelease: "1.0.5"
milestone: "1.0.5"
id: DEV-210
title: I18n de Tarjetas y Estabilidad Visual Zero-CLS en Cambio de Idioma
status: done
priority: p2
type: ux
module: UI / Layout
release: "1.0.5"
created: 2026-10-09
---

## Descripción

Auditoría de textos no localizados y micro-saltos de layout (CLS) en la interfaz:
1. Claves hardcodeadas en tarjetas (`ItemCard.tsx`): la prioridad figuraba en inglés ('P2 Medium') en ambos idiomas; textos de rollup como 'Progreso' y chips de dependencias 'Bloqueada por...' y 'Bloquea...' estaban en español hardcodeado.
2. Al alternar entre ES y EN, las pestañas de navegación y pills de tarjetas variaban de ancho provocando saltos visibles en el contenedor y elementos adyacentes.

## Criterios de Aceptación

<!-- AC:BEGIN -->
- [x] 1. Claves de prioridad 'priority.p0', 'priority.p1', 'priority.p2', 'priority.p3' agregadas en 'en.json' y 'es.json' y consumidas dinámicamente en 'ItemCard.tsx'.
- [x] 2. Textos 'Progreso', 'Bloqueada por...' y 'Bloquea...' en 'ItemCard.tsx' consumen claves de internacionalización ('card.progress', 'card.blockedBy', 'card.blocks').
- [x] 3. Pestañas de navegación en 'Header.tsx' y pills de prioridad adoptan anchos estables/mínimos para evitar jitter y reacomodamiento visual (Zero-CLS) al alternar idioma.
<!-- AC:END -->
