---
id: DEV-153
title: "Cobertura Total de i18n y Erradicacion de 37 Strings Literales Restantes"
status: done
created_date: '2026-10-04'
updated_date: '2026-10-04 04:58'
labels:
  - "i18n"
  - "ui"
  - "open-source-launch"
dependencies:
  - "DEV-152"
priority: high
type: bug
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cierre definitivo de la internacionalización para resolver el hallazgo P1 §4 de la auditoría (`docs/OPEN_SOURCE_LAUNCH_AUDIT.md`):

1. **Unificación incondicional de pestañas principales:** Pestaña 1 debe ser 'Tablero' (ES) / 'Board' (EN) sin sobreescrituras condicionales por metodología Scrumban, Pestaña 2 'Sprints y Backlog' (ES) / 'Sprints & Backlog' (EN) y Pestaña 3 'Versiones' (ES) / 'Releases' (EN).
2. **Erradicación de los 37 strings literales restantes en componentes:**
   - `SprintView.tsx` (10 strings): 'Iniciar Sprint', 'Completar Sprint', 'Ver Retrospectiva', 'Fecha de registro:', textos fallback de retro, contadores 'ítems'.
   - `ImportWizardModal.tsx` (6 strings): 'Contenido Markdown Plano', 'Subir archivo (.md)', etc.
   - `CompleteSprintModal.tsx` (4 strings): 'Completar {sprint}', 'Completadas', 'Pendientes', 'tareas cerradas con éxito', 'tareas no finalizadas', 'Mover tareas pendientes a:', 'Backlog General', 'Devolver tareas al backlog para repriorizarlas'.
   - `ReleaseAssembler.tsx` (4 strings): 'Fecha de Lanzamiento', 'Fecha Objetivo (Target Date)', 'Estado del Paquete', 'Implementado en Producción', 'En Preparación (Unreleased)', 'Resumen Ejecutivo (Summary)', 'Notas de Alcance / Definición de Hito'.
   - `SprintModal.tsx` (3 strings): 'Nombre del Sprint *', 'Objetivo del Sprint (Sprint Goal)', 'Duración Estimada', presets de semanas, 'Fecha de Inicio', 'Fecha de Fin'.
   - `PlanGuardModal.tsx` (2 strings): 'Plan de Implementación / Criterios de Aceptación', '¿Vas a resolver esto con un Agente IA?'.
   - `ItemCard.tsx`, `KanbanBoard.tsx`, `SettingsView.tsx`: Erradicar los residuos literales identificados.
3. Garantizar paridad 1:1 estricta entre `src/locales/es.json` y `src/locales/en.json`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Pestaña 1 muestra 'Tablero' en ES y 'Board' en EN de forma incondicional en `Header.tsx` y `App.tsx`
- [x] #2 Reemplazar los 10 textos literales en `src/components/SprintView.tsx` por claves de traducción en `t()`
- [x] #3 Reemplazar textos y etiquetas literales en `src/components/CompleteSprintModal.tsx` por claves de traducción en `t()`
- [x] #4 Reemplazar textos y etiquetas literales en `src/components/ReleaseAssembler.tsx` por claves de traducción en `t()`
- [x] #5 Reemplazar textos y etiquetas literales en `src/components/SprintModal.tsx`, `ImportWizardModal.tsx` y `PlanGuardModal.tsx`
- [x] #6 Reemplazar textos y etiquetas literales restantes en `ItemCard.tsx`, `KanbanBoard.tsx` y `SettingsView.tsx`
- [x] #7 Paridad 1:1 estricta verificada entre `src/locales/es.json` y `src/locales/en.json` (0 claves faltantes en ambos)
- [x] #8 Pirámide de verificación en verde (`tsc`, `npm test`, `npm run backlog:check`, `npm run publish:check`)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extraer los 37 strings literales identificados en los 9 componentes a claves semánticas en `src/locales/es.json` y `src/locales/en.json`.
2. Actualizar cada componente conectándolo a `useTranslation` y `t()`.
3. Validar consistencia y paridad 1:1 en las claves bilingües.
4. Ejecutar pirámide de verificación completa.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Evitar marcadores HTML literales sin escapar. Cada texto visible por el usuario en la interfaz debe provenir exclusivamente de los diccionarios i18n.
<!-- SECTION:NOTES:END -->
