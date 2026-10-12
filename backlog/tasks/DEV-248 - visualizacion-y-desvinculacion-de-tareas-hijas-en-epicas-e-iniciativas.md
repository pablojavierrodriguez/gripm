---
id: DEV-248
title: "Gestión Visual de Tareas Hijas en Épicas e Iniciativas con Desvinculación Bidireccional Directa"
status: done
created_date: '2026-10-12'
updated_date: '2026-10-12 15:25'
labels:
  - "hierarchy"
  - "epics"
  - "initiatives"
  - "ui"
  - "ux"
  - "relations"
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cuando un ítem en DevBoard/Gripm es de tipo contenedor de alto nivel (`type === 'epic'` o `type === 'initiative'`), el cockpit debe brindar visibilidad completa de su desglose de trabajo y permitir la administración directa de sus tareas hijas desde la vista de detalle (`ItemModal`):

### 1. Panel de Tareas Hijas en ItemModal:
- Detectar dinámicamente si el ítem actual es de tipo `epic` o `initiative` (o si existen ítems en el backlog que declaran `parentId === item.id` o `epic === item.id / item.code`).
- Mostrar una sección dedicada **"Tareas Hijas" / "Child Tasks"** con la lista de ítems dependientes.
- Para cada tarea hija, renderizar sus datos más relevantes:
  - Identificador único (`code` o `id`, ej: `DEV-136`).
  - Tipo con su icono y color (`feature`, `bug`, `ux`, etc.).
  - Título descriptivo (truncado con elipsis limpia si excede el ancho pero accesible por title/tooltip).
  - Badge de Estado actual con su color semántico (`draft`, `doing`, `ready`, etc.).
  - Prioridad e indicador de estimación / asignado si existen.
- Clic en la fila de la tarea hija abre directamente dicho ítem en el modal para navegación fluida entre niveles jerárquicos.

### 2. Desvinculación Bidireccional Directa:
- Cada fila de la lista de hijas cuenta con un botón o acción explícita de **desvincular** (`Quitar relación` / icono de unlink o `X`).
- Al ejecutar la acción desde la vista de la épica/iniciativa padre:
  - Se remueve la relación en el ítem hijo (estableciendo `parentId: ''` y `parent: ''` en su definición).
  - La actualización persiste en disco de forma atómica y reactiva.
  - La lista de hijas del padre y su barra de progreso rollup (`epicProgress`) se actualizan instantáneamente sin recargar la aplicación.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 En ItemModal, cuando el ítem sea de tipo 'epic' o 'initiative' (o tenga tareas asociadas con parentId/epic), renderizar la sección 'Tareas Hijas' con la lista completa de ítems dependientes
- [x] #2 Cada tarea hija en la lista muestra sus datos más relevantes: ID/código, icono y badge de tipo, título descriptivo, badge de estado con color semántico y prioridad
- [x] #3 Permitir abrir el ItemModal de la tarea hija al hacer clic sobre su fila en la lista para navegación jerárquica directa
- [x] #4 Incluir botón de desvinculación rápida en cada fila de tarea hija que limpie la propiedad parentId en el archivo del hijo y persista el cambio vía API/disco
- [x] #5 La desvinculación reactiva actualiza la vista del padre y recalcula las métricas de progreso rollup (epicProgress) sin requerir recarga
- [x] #6 Pirámide de verificación pasa en verde: tsc, npm test, backlog:check y publish:check
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extender `ItemModal.tsx` para computar `childItems = allItems.filter(it => it.parentId === item.id || it.parentId === item.code || it.epic === item.id)`.
2. Diseñar el bloque visual accesible `ChildTasksList` dentro de `ItemModal.tsx`, integrando badges semánticas de estado y tipo.
3. Implementar handler `handleUnlinkChild(childId)` que ejecute la mutación sobre el ítem hijo limpiando `parentId: ''`.
4. Añadir feedback visual con Toast y sincronización de estado local.
5. Ejecutar la Pirámide de Verificación y validar accesibilidad táctil y con teclado.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Invariante: Preservar el stacking context y accesibilidad con teclado (visible focus ring, aria-labels para botones icon-only de desvinculación).
- Invariante: Mantener sincronía con `scripts/backlogMdParser.ts` para que borrar el padre en el hijo persista limpiamente en disco.
<!-- SECTION:NOTES:END -->
