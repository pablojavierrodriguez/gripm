---
id: DEV-229
title: "Módulo Visual de Métricas de Flujo y Salud de Entregas (Analytics Tab)"
status: ready
created_date: '2026-10-09'
updated_date: '2026-10-15'
labels:
  - "analytics"
  - "metrics"
  - "svg"
  - "ui"
  - "modules"
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Diseñar e implementar un módulo opcional de métricas de ingeniería (`metrics` / `analytics`) en la barra de navegación, integrable con el catálogo de add-ons (DEV-220):
1. **Métricas de flujo continuo (Lean):** Brindar visibilidad del ritmo y cadencia de entrega (throughput semanal de tareas cerradas, cycle time promedio) sin caer en estimaciones burocráticas de horas quemadas.
2. **Salud y completitud de Criterios de Aceptación:** Panel visual con gráficos locales que muestra el ratio de criterios de aceptación verificados (`- [x]`) versus pendientes por release o sprint.
3. **Desacoplado y configurable:** Módulo opcional gobernable vía `enabledTabs.metrics` en `.gripm/config.json`. Quien prefiera la experiencia minimalista puede mantenerlo desactivado.
4. **Cálculo reactivo local-first:** Las métricas se calculan en tiempo real leyendo los propios archivos del proyecto en memoria, sin telemetría externa ni servicios analíticos de terceros.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Pestaña opcional de métricas en la barra de navegación gobernable vía enabledTabs.metrics en .gripm/config.json
- [x] #2 Gráficos de throughput y distribución por tipo y estado usando visualización ligera nativa en SVG/Tailwind sin dependencias externas pesadas
- [x] #3 Panel de salud de criterios de aceptación que resume avance de verificación por release y sprint
- [x] #4 Computo reactivo en memoria sin consultas a red ni telemetria externa
- [x] #5 Textos completamente localizados en espanol e ingles en src/utils/i18n.ts
- [x] #6 npm test y npx tsc --noEmit pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implementado `MetricsView.tsx` con arquitectura local-first pura en React, Tailwind CSS y componentes visuales en SVG ligero (cero Recharts u otras dependencias pesadas).
- Se implementaron 4 KPI Cards: Throughput de Entrega, Cycle Time Promedio (días desde creación hasta resolución), Salud de ACs (% verificado) y WIP Activo (doing + review).
- Gráficos nativos de distribución proporcional por Estado (draft, doing, review, ready, done) y distribución por Tipo de Trabajo (feature, bug, ux, tech debt, epic, initiative).
- Panel de Salud de Criterios de Aceptación desglosado por Sprints activos/planificados y Releases versionadas con barras de progreso y conteo de ACs verificados.
- Filtro interactivo de alcance (Scope) para aislar métricas globales, por sprint específico o por versión.
- Integrado en `Header.tsx` y `App.tsx` con soporte para activación condicional vía `enabledTabs.metrics !== false`.
- Ajustado el naming en catálogos i18n (`en.json` y `es.json`) de `header.timeline` y `settings.moduleTimelineTitle`: "Timeline" en inglés y "Cronograma" en español.
- Verificada compatibilidad total con la suite de auditoría de UX (`verify-audit-ux-baseline.js`), `npx tsc --noEmit` y suite unificada `npm test`.
<!-- SECTION:NOTES:END -->
