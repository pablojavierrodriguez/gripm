---
id: DEV-297
title: "Módulo Avanzado de Analytics: Diagrama de Flujo Acumulado (CFD), Histogramas de Ciclo y Predicción"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "analytics"
  - "metrics"
  - "reporting"
  - "future"
dependencies:
  - DEV-229
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extensión avanzada del módulo de analíticas (`DEV-229`) para incorporar herramientas predictivas e históricas profundas de ingeniería de software y gestión ágil:

1. **Diagrama de Flujo Acumulado (Cumulative Flow Diagram - CFD):**
   - Visualización del flujo de tareas en cada estado a lo largo de las semanas.
   - Detección visual de cuellos de botella (ensanchamiento de bandas de `review` o `doing`).
2. **Histograma de Cycle Time y Percentiles (P50, P85, P95):**
   - Gráfico de dispersión de tiempo de entrega por tarea.
   - Cálculo de percentiles para compromisos de entrega basados en evidencia real y no en estimaciones subjetivas.
3. **Simulación de Entrega (Forecasting Monte Carlo):**
   - Proyección de fechas estimadas de finalización de backlog o releases basada en la distribución real del throughput histórico.
4. **Filtros Temporales Dinámicos y Exportación:**
   - Selector de rango de fechas personalizado y exportación de reportes ejecutivos en formato Markdown y PDF.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Diagrama de Flujo Acumulado (CFD) interactivo con bandas de colores correspondientes a cada estado
- [ ] #2 Cálculo de percentiles de Cycle Time (P50, P85, P95) con gráfico de dispersión temporal
- [ ] #3 Módulo de simulación o proyección Monte Carlo para pronóstico de entregas por release
- [ ] #4 Filtro por rango de fechas flexible (último mes, trimestre, año o personalizado)
- [ ] #5 Exportación de reportes ejecutivos resumidos en Markdown
- [ ] #6 npm test y npx tsc --noEmit pasan con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Continuación y profundización de la V1 ligera entregada en `DEV-229`.
<!-- SECTION:NOTES:END -->
