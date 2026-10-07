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
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Definir y documentar los anchos objetivo y la jerarquía de información para mobile, tablet y desktop
- [ ] #2 Reorganizar filtros, estadísticas y acciones del tablero para evitar hacinamiento y saltos de línea accidentales
- [ ] #3 Validar las vistas Kanban y Backlog en anchos táctiles habituales, incluyendo navegación, acciones y scroll
- [ ] #4 Mantener la experiencia desktop compacta y sin regresiones en resoluciones amplias
- [ ] #5 Verificar ambos idiomas y temas, sin overflow horizontal accidental ni pérdida de controles
<!-- AC:END -->
