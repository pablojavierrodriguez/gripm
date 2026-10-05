---
id: DEV-173
title: "Auditoría de Accesibilidad del Cockpit: Foco, Navegación por Teclado y Contraste"
status: draft
created_date: '2026-10-05'
updated_date: '2026-10-05 11:35'
labels:
  - "accessibility"
  - "a11y"
  - "ux"
  - "post-launch"
dependencies: []
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La accesibilidad del producto nunca fue auditada. `npm run audit:ux` es un análisis estático que reporta 313 sugerencias de clases Tailwind arbitrarias (`text-[10px]`, `text-[11px]`) y 0 errores de accesibilidad — **no es un análisis de accesibilidad**. Ninguna otra herramienta del repositorio cubre foco, teclado ni contraste.

### El proyecto ya tiene la herramienta y no la usó

`.agents/skills/code-level-ux-auditor/` está instalado en el repo y audita anti-patrones de UX móvil, colisiones de gestos, scroll, teclado virtual y jank de render. Está orientado a móvil, pero cubre varias de las categorías que importan acá. Nunca se ejecutó como auditoría del codebase.

### Superficie de riesgo

El producto es una interfaz densa: tablero Kanban con drag-and-drop, reordenamiento, filtros, tarjetas, y al menos 5 modales (`ItemModal`, `SprintModal`, `CompleteSprintModal`, `ImportWizardModal`, `PlanGuardModal`, `SettingsView`). Los tres modos de fallo con mayor probabilidad en esta clase de producto son:

1. **Focus trap y retorno de foco en modales.** Un modal que no atrapa el foco deja al usuario de teclado tabulando detrás del overlay; un modal que no devuelve el foco al disparador pierde el contexto al cerrarse.
2. **Navegación por teclado en el Kanban.** Si el reordenamiento y el cambio de estado solo responden a drag-and-drop o click, el producto es inutilizable sin mouse — y `AGENTS.md` §6.16 declara launningham de flujo Kanban como metodología central.
3. **Contraste de los badges de estado.** `src/utils/statusMeta.ts` define clases de color con variantes `dark:` y sin variants. Los badges de 6 estados en dos temas son el texto más pequeño de la pantalla.

### Objetivo

Convertir la accesibilidad de supuesto en verificado: ejecutarla, corregir lo que se encuentre, y decidir si queda incorporateda al gate de CI o es una tarea recurrente de release.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Existe en `backlog/retros/` o en una nota de tarea el resultado de una ejecución real del skill `code-level-ux-auditor` sobre `src/`, con los hallazgos listados — la tarea no se cierra sin evidencia de ejecución
- [ ] #2 Cada modal (`ItemModal`, `SprintModal`, `CompleteSprintModal`, `ImportWizardModal`, `PlanGuardModal`) atrapa el foco mientras está abierto, y devuelve el foco al elemento disparador al cerrarse (verificable por navegación de teclado completa con `Tab`, `Shift+Tab` y `Escape`)
- [ ] #3 El cambio de estado de un ítem en el Kanban y la reordenación son alcanzables por teclado, no solo por drag-and-drop
- [ ] #4 Todos los controles interactivos son alcanzables por teclado; ninguno requiere puntero
- [ ] #5 Los badges de estado de `src/utils/statusMeta.ts` alcanzan una relación de contraste mínima de 4.5:1 en texto pequeño, en tema claro **y** oscuro — el valor se registra en la nota de la tarea
- [ ] #6 Todo elemento con `onClick` y sin rol semántico expone `role`, `tabIndex` y handler de teclado, o se convierte en `<button>` nativo
- [ ] #7 Existe `prefers-reduced-motion` respetado en las animaciones existentes (splash, transiciones de tema, dots de estado)
- [ ] #8 La decisión queda registrada: la accesibilidad se incorpora como paso de `npm run audit:ux` y CI, o se declara como tarea recurrente de release con la razón
- [ ] #9 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores y `npm test` con exit 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Ejecutar el skill `code-level-ux-auditor` sobre `src/` y registrar los hallazgos sin filtrar.
2. Auditar foco en los 5 modales: trampa de foco, retorno al cerrarse, y cierre con `Escape`.
3. Verificar alcanzabilidad por teclado del Kanban: cambio de estado, reordenamiento, filtros.
4. Medir contraste de los badges de estado en ambos temas y corregir las clases que no alcancen 4.5:1.
5. Normalizar controles semánticos: preferir `<button>` nativo sobre `div` con `onClick`.
6. Respetar `prefers-reduced-motion` en las animaciones existentes.
7. Decidir y documentar si esto entra al gate de CI.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Por qué `audit:ux` no cubre esto

Su resumen es "0 errores, 0 advertencias, 313 sugerencias" y todas las sugerencias son de tamaño de texto arbitrario. Es un linter de estilo, no un auditor de accesibilidad. Presentarlo como cobertura de a11y sería el error a evitar.

### Por qué el teclado es prioridad sobre el contraste

Un usuario de teclado no puede usar el producto; un usuario con visión baja sí puede usar un producto con contraste pobre. El impacto funcional ordena las dos cosas.

### Costo

Es la tarea más grande de este lote y no se resuelve en un día. Se puede entregar por etapas — foco en modales primero, que es donde el fallo es más común y más她了. Los ACs son independientes y se pueden ir tildando.
<!-- SECTION:NOTES:END -->