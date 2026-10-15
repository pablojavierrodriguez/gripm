---
id: DEV-274
title: "Optimización de densidad para Metodología y Vistas en Settings (1366×768)"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "ui"
  - "settings"
  - "desktop"
dependencies: []
priority: medium
type: ux
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En `SettingsView.tsx` (pestaña *Workflow & Views*), la sección *Project Work Methodology* despliega tres tarjetas voluminosas con descripciones extensas y badges, seguidas inmediatamente por otras tres tarjetas similares para *Default View Selector*.

En resoluciones de escritorio habituales como 1366×768 (y monitores estándar de laptop), esta distribución consume prácticamente todo el primer pliegue de pantalla (*above the fold*), desplazando hacia abajo las opciones críticas de activación de pestañas y configuración de vistas.

### Objetivos:
1. Reemplazar los bloques masivos de tarjetas por selectores compactos (ej. radio cards de 1 fila o segmented control interactivo con icono, título y badge conciso).
2. Trasladar los textos explicativos extensos a tooltips contextuales o descripciones de una sola línea con jerarquía atenuada.
3. Asegurar que las opciones de *Habilitación de Pestañas* y *Vistas de Trabajo* queden visibles sin requerir scroll excesivo.
4. Mantener la alineación con los principios de densidad de escritorio establecidos en DEV-264.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 El selector de Metodología de Trabajo ocupa una altura significativamente menor mediante un diseño horizontal compacto
- [ ] #2 El selector de Vista por Defecto utiliza un control segmentado estilizado y no una grilla de tarjetas altas
- [ ] #3 A resolución 1366×768, la sección completa de Metodología y Vistas permite visualizar los controles principales en el primer scroll
- [ ] #4 Las descripciones de cada metodología siguen accesibles para el usuario (mediante hint o tooltip)
- [ ] #5 `npm run audit:ux` y `npm test` pasan sin regresiones
<!-- AC:END -->
