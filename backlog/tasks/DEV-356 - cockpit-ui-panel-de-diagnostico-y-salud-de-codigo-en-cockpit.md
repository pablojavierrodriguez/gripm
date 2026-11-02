---
id: DEV-356
title: "Cockpit UI: Panel de Diagnostico y Salud de Codigo en Cockpit Web"
status: ready
created_date: '2026-10-31'
updated_date: '2026-11-01'
labels:
  - "frontend"
  - "ui"
  - "ux"
  - "audit"
  - "cockpit"
dependencies:
  - "DEV-355"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Construir la experiencia visual en el Cockpit web (`src/`) para consultar el estado de salud del codigo y gestionar los hallazgos de auditoria sin interrumpir los flujos de trabajo habituales (Kanban, Sprints, Releases, Timeline).

### Componentes de UI:
1. **Health Badge en Header (`src/components/Header.tsx`):**
   - Incorpora una pastilla sutil en la cabecera mostrando el puntaje de salud (`Salud: 85/100`) con indicador visual semantico (verde >= 80, amarillo 60-79, rojo < 60).
   - Area tactil minima de 44x44px y anillo de foco accesible (`focus-visible:ring-2`).
   - En perfiles *Minimalistas*, puede ocultarse o reducirse a un indicador discreto segun `.gripm/config.json` para respetar el principio Zero-Clutter.

2. **Modal de Diagnostico y Acciones (`AuditModal.tsx`):**
   - Renderizado via `createPortal(..., document.body)` para evitar colisiones de stacking context y overflow.
   - Pestaña/Seccion 1 - **Presupuestos y Modularidad:** Lista de archivos que superan las 500 y 1000 lineas, con enlaces de referencia y conteo exacto de lineas.
   - Pestaña/Seccion 2 - **TODOs en Codigo:** Listado de comentarios detectados con opcion de seleccion multiple y boton de accion rapida *"Importar seleccionados como tareas"*.
   - Pestaña/Seccion 3 - **Calidad Anti-Slop:** Detalle de `@ts-ignore` y `eslint-disable` en el repositorio.
   - Accion de re-escaneo manual con estado de carga ("Refrescar diagnostico").

3. **Estandares de Diseno y Ergonomia:**
   - Tipografia 100% canónica de Tailwind (`text-xs`, `text-sm`, `text-base`), prohibidas clases arbitrarias como `text-[10px]`.
   - Soporte para temas claro y oscuro (`dark:`) sin perdida de contraste.
   - Trampa de foco accesible y cierre mediante tecla Escape.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El Header renderiza el indicador de salud consumiendo los datos de GET /api/audit sin provocar layout shifts (Zero-CLS).
- [x] #2 Al hacer clic en el indicador de salud se abre el modal AuditModal montado en document.body mediante createPortal.
- [x] #3 El modal permite navegar entre las secciones de modularidad, TODOs y supresiones de calidad con teclado y raton.
- [x] #4 La lista de TODOs permite seleccionar elementos y ejecutar la importacion a traves de POST /api/audit/import-todos refrescando la vista del Backlog.
- [x] #5 El boton de re-escaneo invoca POST /api/audit/refresh y actualiza las metricas en pantalla con feedback de carga.
- [x] #6 No se introducen clases de tamano de fuente arbitrarias (cumplimiento de regla UX-011 verificable por audit-ux-baseline).
- [x] #7 El modal cuenta con gestion de foco accesible, cierre con tecla Escape y tap targets superiores a 44x44px.
- [x] #8 La suite de pruebas de UI y build de Vite (npm run build y npm test) aprueba con codigo de salida 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Disenar el hook `useRepoAudit` para fetching, caching y mutacion de datos de auditoria en el cliente React.
2. Implementar el componente `AuditBadge` en el Header con accesibilidad completa y respeto a los toggles de configuracion.
3. Construir `AuditModal` con portales, pestañas de navegacion y seleccion multiple de TODOs.
4. Integrar la llamada al endpoint de importacion y disparar toast o notificacion de exito.
5. Ejecutar la suite de auditoria estatica de UX (`npm run test:ui` o `node scripts/audit-ux-code.cjs`) y compilar con `npm run build`.
<!-- SECTION:PLAN:END -->
