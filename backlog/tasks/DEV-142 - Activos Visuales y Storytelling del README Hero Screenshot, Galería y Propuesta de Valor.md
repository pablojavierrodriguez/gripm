---
id: DEV-142
title: "Activos Visuales y Storytelling del README: Hero Screenshot, Galería y Propuesta de Valor"
status: ready
created_date: '2026-10-01'
updated_date: '2026-10-07'
labels: []
dependencies: []
priority: high
type: docs
milestone: "1.0.4"
releases:
  - "1.0.4"
release: "1.0.4"
targetRelease: "1.0.4"
sprints: []
sprint: ""
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Para una herramienta visual e interactiva como Gripm, la presencia de capturas de alta calidad y un pitch narrativo inmediato es clave para explicar el producto y convertir visitas en adopción. Esta tarea abarca la creación de assets gráficos y la mejora del storytelling en el README bilingüe.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Crear carpeta `docs/screenshots/` para almacenar imágenes y capturas optimizadas del cockpit
- [x] #2 Capturar imágenes del Kanban Board en modo oscuro y claro con tareas sintéticas del proyecto de demostración
- [x] #3 Capturar vistas clave: Sprint Hub con métricas y Release Assembler con changelog generado
- [x] #4 Insertar hero image en la parte superior de README.md y README.es.md con badge de capturas del producto
- [x] #5 Agregar galería bilingüe en ambos READMEs con descripciones concisas
- [x] #6 Fortalecer el storytelling con la propuesta local-first y el mensaje «Tu hoja de ruta no debería vivir en servidores ajenos» / “Your roadmap shouldn't live on someone else's servers.”
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preparar una instancia aislada con el proyecto de demostración para capturar sin exponer el backlog real del repositorio.
2. Guardar capturas compactas en `docs/screenshots/`: Kanban en ambos temas, planificación de Sprint/Backlog y notas compiladas de una release.
3. Actualizar el hero, la galería, los badges y la propuesta de valor de los README en español e inglés.
4. Verificar cada referencia de imagen, las dimensiones y el estado de Git/worktrees tras la captura.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Se capturaron cuatro PNG optimizados (81–134 KB) desde una instancia temporal en modo multi-proyecto con un `GRIPM_HOME` aislado y el fixture `data/demo-backlog.json`. Se añadieron hero, badge, galería y mensaje local-first a ambos README. `npm run backlog:check` y `git diff --check` pasan; todas las rutas de imagen referenciadas existen. Se eliminaron las ramas locales ya fusionadas o sin código vivo pendiente.
<!-- SECTION:NOTES:END -->
