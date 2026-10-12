---
id: DEV-253
title: "Optimizaciones de UX: ergonomía de estimación, contraste de filtros y desacople de tema en módulos"
status: done
created_date: '2026-10-12'
updated_date: '2026-10-12'
labels:
  - "ux"
  - "ui"
  - "settings"
  - "filters"
  - "estimation"
dependencies: []
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Corrección integral de defectos de experiencia de usuario, contraste y ergonomía visual identificados en uso real:
1. Alto contraste en desplegables de filtros avanzados (Sprint, Release, Módulo) bajo modo oscuro en Chromium/Windows mediante fondos opacos y estilizado nativo de opciones.
2. Aislamiento e inmunidad del tema visual al interactuar con switches de módulos y add-ons en Configuración (Sprints, Releases, Hub, Calendar), erradicando el cambio forzado a dark mode.
3. Desacople del estado del input manual de estimación en ItemModal, eliminando la colisión de foco y vaciado de campo al tipear valores compuestos (como 55 u 89).
4. Disposición horizontal en una sola línea para pantallas de 1366px con presets canónicos de Planning Poker (0 a 21) y pastilla inline compacta.
5. Corrección de relaciones jerárquicas hacia la épica DEV-233 y guardias de módulos activos en tarjetas Kanban.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Desplegables de filtros en AdvancedFiltersPopover cuentan con fondo opaco #131c2f, borde slate-700/80, chevron pointer-events-none y opciones estilizadas con alto contraste en dark mode
- [x] #2 Switches de Modules & Add-ons en SettingsView preservan el tema activo (light/dark/system) sin forzar el modo oscuro al persistir cambios
- [x] #3 Campo manual de estimación en ItemModal desacopla su estado local customEstimateInput, permitiendo tipear dígitos arbitrarios (55, 89) sin vaciar el input ni activar botones superiores
- [x] #4 Selector de estimación encaja al 100% en una sola línea horizontal en resolución 1366px gracias a DEFAULT_FIBONACCI hasta 21 y pastilla compacta
- [x] #5 Tareas hijas de DEV-233 vinculadas formalmente y chips de módulos en ItemCard protegidos por flags de activación
- [x] #6 Pirámide de verificación en verde (tsc, audit-ux-code, npm test de 16 pasos y npm run build)
<!-- SECTION:DESCRIPTION:END -->
