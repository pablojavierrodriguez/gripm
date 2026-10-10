---
id: DEV-229
title: "Módulo Visual de Métricas de Flujo y Salud de Entregas (Analytics Tab)"
status: draft
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "analytics"
  - "metrics"
  - "recharts"
  - "ui"
  - "modules"
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Diseñar e implementar un módulo opcional de métricas de ingeniería (`metrics` / `analytics`) en la barra de navegación, integrable con el catálogo de add-ons (DEV-220):
1. **Métricas de flujo continuo (Lean):** Brindar visibilidad del ritmo y cadencia de entrega (throughput semanal de tareas cerradas, cycle time promedio) sin caer en estimaciones burocráticas de horas quemadas.
2. **Salud y completitud de Criterios de Aceptación:** Panel visual con gráficos locales (vía Recharts) que muestra el ratio de criterios de aceptación verificados (`- [x]`) versus pendientes por release o sprint.
3. **Desacoplado y configurable:** Módulo opcional gobernable vía `enabledTabs.metrics` en `.gripm/config.json`. Quien prefiera la experiencia minimalista puede mantenerlo desactivado.
4. **Cálculo reactivo local-first:** Las métricas se calculan en tiempo real leyendo los propios archivos del proyecto en memoria, sin telemetría externa ni servicios analíticos de terceros.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Pestaña opcional de metricas en la barra de navegacion gobernable via enabledTabs.metrics en .gripm/config.json
- [ ] #2 Graficos de throughput y distribucion por tipo y estado usando Recharts en ejecucion local
- [ ] #3 Panel de salud de criterios de aceptacion que resume avance de verificacion por release y sprint
- [ ] #4 Computo reactivo en memoria sin consultas a red ni telemetria externa
- [ ] #5 Textos completamente localizados en espanol e ingles en src/utils/i18n.ts
- [ ] #6 npm test y npx tsc --noEmit pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Aprovechar las pautas de diseño y visualización de la skill `recharts-reporting`.
<!-- SECTION:NOTES:END -->
