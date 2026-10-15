---
id: DEV-275
title: "Gestión centralizada de módulos y componentes en Settings con asignación múltiple en tareas"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "feature"
  - "model"
  - "settings"
  - "tasks"
dependencies: []
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Actualmente, el campo de módulo en las tareas (`module?: string`) es un string libre con un datalist no gobernado que se alimenta de valores preexistentes en las tarjetas. Esto provoca inconsistencias ortográficas y fragmentación (ej. `"UI"`, `"ui"`, `"Frontend"`, `"Front-end"`). Además, una tarea solo puede apuntar a un único módulo, impidiendo clasificar ítems que atraviesan componentes transversales (ej. un feature que afecta `Frontend` y `API`).

### Objetivos:
1. **Catálogo de Componentes/Módulos en Settings:** Permitir definir, agregar, renombrar y eliminar una lista oficial de módulos o componentes del proyecto en `.gripm/config.json` (`components: string[]` o `modulesList: string[]`).
2. **Asignación Múltiple en Tareas:** Extender el modelo de `BacklogItem` para soportar múltiples módulos (`modules?: string[]`), preservando compatibilidad retroactiva con `module: string`.
3. **Selector ergonómico en ItemModal:** Reemplazar el input simple por un selector multi-chip donde el usuario puede elegir uno o más componentes predefinidos y opcionalmente crear uno nuevo sobre la marcha si cuenta con permisos.
4. **Filtro unificado:** Actualizar los filtros de la barra superior y del popover para filtrar por cualquiera de los módulos asociados.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Existe una sección en Settings para administrar la lista canónica de módulos / componentes del proyecto
- [ ] #2 Los componentes administrados se persisten en la configuración del proyecto
- [ ] #3 ItemModal permite asignar uno o varios módulos a una tarjeta mediante chips interactivos
- [ ] #4 Se mantiene la compatibilidad con tareas históricas que tienen un único string en el campo `module`
- [ ] #5 La tarjeta (ItemCard) renderiza los badges de módulos de forma compacta y legible
- [ ] #6 El filtro por módulo en FilterBar y AdvancedFiltersPopover soporta búsqueda multi-módulo
- [ ] #7 `npm test` y sincronización de backlog con código 0
<!-- AC:END -->
