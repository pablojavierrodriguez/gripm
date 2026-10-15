---
id: DEV-281
title: "Épica: Vista interactiva de Timeline y Roadmap con agrupación jerárquica y fechas"
status: ideas
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "epic"
  - "roadmap"
  - "timeline"
  - "gantt"
  - "planning"
dependencies: []
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Iniciativa de producto para dotar a Gripm de una vista visual de **Timeline / Roadmap (Gantt-style)**, orientada al planeamiento estratégico, seguimiento de compromisos temporales y comunicación con stakeholders.

Actualmente, Gripm carece de un modelo de fechas de inicio y fin en las tareas individuales (`BacklogItem`), y la visualización temporal se limita a las fechas fijadas en Sprints y Releases.

### Alcance propuesto por fases:

#### Fase 1: Extensión del Modelo de Datos y Fechas
1. Incorporar campos opcionales `startDate?: string` y `dueDate?: string` en `BacklogItem` (`src/types.ts`) y serialización transparente en frontmatter Markdown.
2. Permitir que una tarea herede fechas estimadas automáticamente del Sprint asignado (`startDate` / `endDate`) o de la Release (`targetDate`) si no tiene fechas explícitas.

#### Fase 2: Vista de Roadmap y Agrupación por Parent (Solo Lectura / Render)
1. Nueva pestaña o submódulo de navegación: **Roadmap / Timeline**.
2. Agrupación por jerarquía: Las Épicas e Iniciativas actúan como filas principales colapsables/desplegables que contienen sus tareas hijas (`parentId`).
3. Escalas de tiempo dinámicas (zoom por Trimestre / Q1-Q4, Meses y Sprints).
4. Barras visuales con código de color según estado (`draft`, `doing`, `ready`, `done`) y porcentaje de progreso.

#### Fase 3: Interactividad y Planificación Directa
1. Capacidad de arrastrar barras para desplazar fechas o extender/reducir plazos temporales.
2. Renderizado de líneas de dependencia horizontal (`blocks` / `blockedBy`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Especificación y diseño de arquitectura para el soporte de fechas (startDate/dueDate) en BacklogItem
- [ ] #2 Vista Timeline accesible desde la navegación principal de vistas
- [ ] #3 Capacidad de alternar escalas de tiempo (Trimestres, Meses, Sprints)
- [ ] #4 Agrupación jerárquica por Parent (Épica/Iniciativa) con acordeón colapsable para sus tareas dependientes
- [ ] #5 Renderizado claro de barras temporales diferenciando tareas planificadas, en curso y completadas
- [ ] #6 Preservación del rendimiento y Zero-CLS en el canvas de timeline sin dependencias pesadas
<!-- AC:END -->
