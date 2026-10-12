---
id: DEV-255
title: "Command Palette global y buscador de acciones rápidas (⌘K)"
status: draft
created_date: '2026-10-12'
updated_date: '2026-10-12'
labels:
  - "ux"
  - "navigation"
  - "command-palette"
  - "ui"
dependencies: []
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Diseño e implementación de una Command Palette interactiva global (estilo Linear, Raycast o GitHub) activada con `⌘K` o `Ctrl+K`:
1. Modal flotante central con buscador difuso de alta velocidad.
2. Salto directo a tareas (`DEV-XXX`) y apertura inmediata de su modal de edición con Enter.
3. Menú de acciones rápidas ejecutables: cambiar de vista (Tablero, Sprints, Releases, Papelera, Configuración), alternar tema (Claro/Oscuro), cambiar idioma, sincronizar backlog con /docs, cambiar proyecto activo y crear nueva tarea.
4. Navegación completa por teclado con flechas `↑` y `↓`, selección con `Enter` y cierre con `Escape`.
5. Filtro de comandos por categorías (Navegación, Tareas, Proyectos, Ajustes).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Atajo ⌘K / Ctrl+K abre el modal flotante de Command Palette en lugar de enfocar únicamente el input de filtros
- [ ] #2 Buscador filtra en tiempo real tareas existentes y comandos de acción rápida
- [ ] #3 Permite navegar por la lista de resultados con teclas de flecha y ejecutar la acción seleccionada con Enter
- [ ] #4 Incluye acciones para cambiar vistas, alternar tema, crear tarea, cambiar proyecto y sincronizar documentación
- [ ] #5 Accesibilidad completa con role combobox/listbox, useFocusTrap y compatibilidad responsive
<!-- SECTION:DESCRIPTION:END -->
