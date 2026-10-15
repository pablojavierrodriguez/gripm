---
id: DEV-274
title: "Optimización de densidad para Metodología y Vistas en Settings (1366×768)"
status: done
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
- [x] #1 El selector de Metodología de Trabajo ocupa una altura significativamente menor mediante un diseño horizontal compacto
- [x] #2 El selector de Vista por Defecto utiliza un control segmentado estilizado y no una grilla de tarjetas altas
- [x] #3 A resolución 1366×768, la sección completa de Metodología y Vistas permite visualizar los controles principales en el primer scroll
- [x] #4 Las descripciones de cada metodología siguen accesibles para el usuario (mediante hint o tooltip)
- [x] #5 `npm run audit:ux` y `npm test` pasan sin regresiones
<!-- AC:END -->

## Implementation Notes

- Rediseño de tarjetas de *Project Work Methodology*: Reducidas de ~150px a ~54px de altura mediante radio cards horizontales compactas de 1 fila con icono, título truncable, badge conciso en la cabecera y descripción de 1 línea con tooltip nativo `title` para acceso completo.
- Rediseño de *Default View Selector*: Implementado como segmented control estilizado (`inline-flex flex-wrap p-1 rounded-xl ...`) con botones activos e inactivos acordes a la identidad visual de Gripm, badge de vista core, tooltip contextual y línea de estado descriptiva única.
- Preservación de accesibilidad y ergonomía: navegación por teclado con `focus-visible:ring-2 focus-visible:ring-indigo-500`, roles semánticos `role="radio"` y feedback táctil `active:scale-[0.98]`.
- Optimización vertical a 1366×768: el pliegue inicial permite visualizar directamente la sección de metodología, selector de vista por defecto y los interruptores de habilitación de pestañas (Kanban, Sprints, Releases) sin requerir scroll.
- Verificación: tipado TypeScript estricto validado con `npx tsc --noEmit` (0 errores) y pruebas unitarias de lógica de UI en `scripts/test-ui-logic.js` en verde.

