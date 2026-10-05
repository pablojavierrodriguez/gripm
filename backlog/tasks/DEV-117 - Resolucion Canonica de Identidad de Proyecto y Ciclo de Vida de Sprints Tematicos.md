---
id: DEV-117
title: "Resolución Canónica de Identidad de Proyecto y Ciclo de Vida de Sprints Temáticos"
status: done
created_date: '2026-09-26'
updated_date: '2026-10-02 23:43'
labels:
  - "core"
  - "sprints"
  - "scaffolding"
  - "ux"
dependencies: []
priority: high
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
order: "50"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolver la confusión estructural entre el nombre del directorio en el sistema de archivos (`path.basename`, ej: `"my-repo"`) y el nombre real del proyecto o aplicación (definido en `package.json` o `.devboard/config.json`, ej: `"MyApp"`), así como la invisibilidad de botones de ciclo de vida (Iniciar/Completar Sprint) y del selector "Ver completados" en sprints temáticos no numerados.

**Causas Raíz Identificadas:**
1. **Confusión de Identidad Directorio vs Producto:** `bin/devboard.js`, `initScaffold.js` y `vite.config.ts` asumían ciegamente `path.basename(targetRepo)` como nombre e ID del proyecto. Si un repositorio `MyApp` se clonó en una carpeta `my-repo`, DevBoard registraba el proyecto como `my-repo`, generando una discrepancia de IDs entre el proyecto activo y las tareas/sprints del backlog.
2. **Ciclo de Vida Roto para Sprints Temáticos:** La auto-inicialización de sprints en `vite.config.ts` intentaba extraer un número (`parseInt(name.replace(/\D/g, ''), 10)`). En sprints temáticos (ej. *"Integridad Financiera"*, *"Performance y Escala"*), esto arrojaba `0`, provocando que todos se marcaran simultáneamente como `active`.
3. **Omisión de Botones en SprintView:** Si un sprint no estaba explícitamente dado de alta en `sprints.json`, `SprintView.tsx` no generaba `sprintObj`, ocultando completamente las insignias de estado y los botones de acción (`Completar Sprint`, `Ver Retrospectiva`). Además, el contador `completedSprintsCount` no detectaba grupos con 100% de tareas completadas, ocultando el botón "Ver completados".
4. **Filtro Estricto de ProjectId en Single-Project:** En `App.tsx`, las listas `allProjectItems`, `projectSprints` y `projectReleases` filtraban rígidamente por `projectId === selectedProjectId`, descartando elementos si había disparidad entre el ID de carpeta y el ID del paquete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Implementar `resolveProjectIdentity(repoPath)` con cascada canónica: 1) `.devboard/config.json`, 2) `package.json` (`productName`, `displayName`, `name`), 3) `path.basename(repoPath)`.
- [x] #2 Integrar `resolveProjectIdentity` en `bin/devboard.js`, `scripts/initScaffold.js`, `getRegistry()`, `readProjectBacklog()` y resolución de `activeProject` en `vite.config.ts`.
- [x] #3 En `initScaffold.js`, permitir al usuario confirmar o personalizar el nombre del proyecto en el asistente interactivo y persistirlo en `.devboard/config.json`.
- [x] #4 En `vite.config.ts`, eliminar la deducción numérica regex de sprints y auto-reconciliar el estado a `'completed'` cuando el 100% de las tareas estén en `done`, `ready` o `finish`.
- [x] #5 En `SprintView.tsx`, calcular `completedSprintsCount` considerando tanto `sprints.json` como grupos de tareas 100% completadas, y proveer fallback dinámico para `sprintObj` asegurando renderizado de insignias y botones de ciclo de vida.
- [x] #6 En `App.tsx`, asegurar que en `singleProject` (o `projects.length <= 1`), las colecciones `allProjectItems`, `projectSprints` y `projectReleases` no descarten elementos por discrepancias de `projectId`.
- [x] #7 Validar tipado TypeScript estricto (`npx tsc --noEmit`), suite de pruebas (`npm test`) y chequeo de integridad (`npm run backlog:check`).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear función `resolveProjectIdentity` en `scripts/registryConfig.js` y exportarla.
2. Integrar `resolveProjectIdentity` en `bin/devboard.js` y `scripts/initScaffold.js`.
3. Extender `vite.config.ts` para enriquecer la metadata de proyectos con `resolveProjectIdentity` en `getRegistry`, `readProjectBacklog` y middleware `/api/data`.
4. Mejorar `src/components/SprintView.tsx` con fallback de `sprintObj` y cálculo ampliado de `completedSprintsCount`.
5. Proteger `allProjectItems`, `projectSprints` y `projectReleases` en `src/App.tsx` en modo mono-proyecto.
6. Ejecutar Quality Gates (`tsc`, `test`, `backlog:check`).
<!-- SECTION:PLAN:END -->
