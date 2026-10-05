---
id: DEV-101
title: "Extensión de script audit:ux con detección estática de anti-patrones UX-009 y UX-010"
status: done
created_date: '2026-09-24'
updated_date: '2026-10-02 23:43'
labels: []
dependencies: []
priority: medium
type: ux
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
order: "40"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tras los aprendizajes de la retrospectiva de Sprint 5, se requiere enriquecer la herramienta de análisis estático local `scripts/audit-ux-code.cjs` para detectar preventivamente el uso de `truncate` en textos explicativos de diálogos y verificar que los estilos globales mantengan la reserva de espacio de la barra de desplazamiento para evitar layout shifts (CLS).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Incorporar regla UX-009 en scripts/audit-ux-code.cjs para reportar warning si se detecta 'truncate' en componentes modales o de diálogo (ej: *Modal.tsx).
- [x] #2 Incorporar regla UX-010 en scripts/audit-ux-code.cjs para verificar la presencia de 'overflow-y: scroll' y 'scrollbar-gutter: stable' en el archivo principal CSS.
- [x] #3 Ejecutar npm run audit:ux y comprobar que no genere falsos positivos en celdas de tabla o headers.
- [x] #4 UX-009 se acota a archivos cuyo nombre contiene 'Modal' o 'Dialog', de modo que el uso legítimo de `truncate` en celdas de tabla y headers de SprintView y KanbanBoard no se ve afectado
- [x] #5 Los dos casos legítimos de `truncate` dentro de un diálogo (nombre de carpeta y ruta en FolderPickerModal) quedan documentados con un opt-out que exige motivo escrito, en lugar de degradar la severidad de la regla
- [x] #6 UX-010 se reporta con severidad ERROR porque su ausencia reintroduce CLS horizontal, y verifica las dos propiedades dentro del bloque `html` de index.css (no en cualquier parte del archivo)
- [x] #7 Se agrega un test de regresión en `scripts/test-parser.js` que verifica que UX-009 y UX-010 están conectadas y disparan, para evitar el caso del linter que no reporta nada porque no mira nada
- [x] #8 `npx tsc --noEmit` finishes con código 0
- [x] #9 `npm test` finishes con código 0
- [x] #10 `npm run backlog:check` finishes con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Abrir scripts/audit-ux-code.cjs y añadir detectores de expresiones regulares para 'truncate' en archivos cuyo nombre contenga 'Modal'.
2. Añadir chequeo en index.css para validar la regla de scrollbar estable.
3. Probar con npm run audit:ux.
<!-- SECTION:PLAN:END -->
