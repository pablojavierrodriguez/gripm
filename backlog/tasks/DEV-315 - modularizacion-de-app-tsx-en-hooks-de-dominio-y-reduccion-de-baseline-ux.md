---
id: DEV-315
title: "Modularizacion de App.tsx en hooks de dominio y reduccion de deuda en audit-ux-baseline"
status: draft
priority: medium
type: refactor
owner: Antigravity
estimate: 3d
sprint: ""
release: ""
created: 2026-10-17
updated: 2026-10-17
---

# DEV-315 - Modularizacion de App.tsx en hooks de dominio y reduccion de deuda en audit-ux-baseline

## Descripcion

El componente raíz `src/App.tsx` ha acumulado más de 800 líneas de código y concentra múltiples responsabilidades dispares:
- Gestión de estado global de navegación y pestañas activas.
- Lógica de sincronización y polling con la API REST (`/api/tasks`, `/api/releases`, `/api/stats`).
- Coordinación de atajos de teclado globales (`handleKeyDown`, focus management).
- Apertura y estado de múltiples modales (`ItemModal`, `ConfirmModal`, `KeyboardShortcutsModal`, `ProjectManagerModal`).
- Control de filtros y vistas (búsqueda, filtros por tag, estado y ordenamiento).

Al mismo tiempo, la suite de auditoría de UX mantiene excepciones registradas en `tests/audit-ux-baseline.json` (como clases de tipografía o layout no canónicas).

Esta tarea refactoriza y desacopla `src/App.tsx` en hooks especializados y componentes de orquestación, asegurando:
1. Extracción de hooks limpios: `useBacklogData`, `useModalManager`, `useGlobalKeyboardShortcuts`, `useBacklogFilterState`.
2. Reducción sustancial del tamaño de `src/App.tsx` (< 300 líneas), convirtiéndolo en un componente de layout declarativo y orquestador limpio.
3. Auditoría y resolución de las inconsistencias tipográficas y visuales registradas en `tests/audit-ux-baseline.json`, reduciendo el baseline de excepciones a cero o al mínimo técnico estricto.

## Criterios de Aceptacion

<!-- AC:BEGIN -->
- [ ] Extraer la lógica de fetching, mutación optimista y polling a hooks especializados en `src/hooks/` (e.g. `useBacklogData`).
- [ ] Extraer la gestión de atajos de teclado y modales a hooks desacoplados.
- [ ] Reducir la complejidad ciclomática y longitud de `src/App.tsx` a menos de 300 líneas.
- [ ] Auditar y corregir las excepciones de UI listadas en `tests/audit-ux-baseline.json`.
- [ ] Verificar que no se introducen regresiones funcionales ni visuales en la navegación, atajos ni modales.
- [ ] La Pirámide de Verificación (`tsc --noEmit`, `npm test`, `npm run test:ui`) pasa con 0 errores.
<!-- AC:END -->

## Notas Tecnicas

- Mantener la experiencia Zero-CLS y los portales para modales existentes.
- Cero uso de em-dash o en-dash, respetando la regla canónica de guión simple ` - `.
