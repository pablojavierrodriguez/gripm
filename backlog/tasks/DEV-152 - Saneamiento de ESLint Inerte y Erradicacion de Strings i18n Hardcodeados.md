---
id: DEV-152
title: "Saneamiento de ESLint Inerte y Erradicacion de Strings i18n Hardcodeados"
status: done
created_date: '2026-10-03'
updated_date: '2026-10-04 00:15'
labels:
  - "i18n"
  - "hygiene"
  - "open-source-launch"
  - "ui"
dependencies:
  - "DEV-060"
  - "DEV-140"
  - "DEV-151"
priority: high
type: bugfix
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cierre de los dos hallazgos de prioridad alta (P1) detectados en la auditoría pre-lanzamiento open-source (`docs/OPEN_SOURCE_LAUNCH_AUDIT.md` §6.1 y §6.2):

1. **Saneamiento de ESLint Inerte:** `eslint.config.js` existía como un archivo de 17 líneas sin parser de TypeScript ni plugins reales, con sus únicas dos reglas en `off` y sin `eslint` en dependencias. Se elimina el archivo de configuración muerto y se ajustan los ACs de DEV-140 para reflejar con honestidad que la garantía estricta de código la provee `tsc --noEmit` junto con el hook pre-commit y el nuevo guard de publicación.
2. **Erradicación de Strings Hardcodeados en i18n:** Conectar todos los textos y placeholders literales de la interfaz a `t()` en `App.tsx` (navegación móvil 'Tablero', 'Sprint', 'Releases', 'Papelera', toasts), `SprintView.tsx` ('Sin Sprint', diálogos), `ProjectModal.tsx`, `CompleteSprintModal.tsx`, `SprintModal.tsx`, `ReleaseAssembler.tsx`, `ImportWizardModal.tsx`, `PlanGuardModal.tsx` y `FolderPickerModal.tsx`. Garantizar paridad total de claves entre `src/locales/es.json` y `src/locales/en.json`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Eliminar el archivo inerte `eslint.config.js` y ajustar los criterios de DEV-140
- [x] #2 Conectar la navegación móvil y toasts de `src/App.tsx` a `t()`
- [x] #3 Reemplazar textos y selectores 'Sin Sprint', tooltips y confirmaciones en `src/components/SprintView.tsx` por llamadas a `t()`
- [x] #4 Internacionalizar `src/components/ProjectModal.tsx` incorporando el hook `useTranslation`
- [x] #5 Internacionalizar placeholders y modales de `CompleteSprintModal.tsx`, `SprintModal.tsx`, `ReleaseAssembler.tsx`, `PlanGuardModal.tsx`, `ImportWizardModal.tsx` y `FolderPickerModal.tsx`
- [x] #6 Paridad estricta 1:1 en las claves añadidas en `src/locales/es.json` y `src/locales/en.json`
- [x] #7 `npx tsc --noEmit` con 0 errores y pirámide de verificación en verde (`npm test`, `npm run backlog:check`, `npm run publish:check`)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Eliminar `eslint.config.js` y actualizar DEV-140.
2. Identificar y agregar todas las nuevas claves requeridas en `src/locales/es.json` y `src/locales/en.json`.
3. Actualizar `src/App.tsx` para usar `t()` en navegación móvil y toasts principales.
4. Actualizar `src/components/ProjectModal.tsx` con `useTranslation` y claves traducidas.
5. Actualizar `src/components/SprintView.tsx` ('Sin Sprint', títulos, diálogos).
6. Actualizar placeholders y textos en `CompleteSprintModal`, `SprintModal`, `ReleaseAssembler`, `ImportWizardModal`, `PlanGuardModal`, `FolderPickerModal`.
7. Ejecutar pirámide de verificación completa.
<!-- SECTION:PLAN:END -->

## Technical Notes

<!-- SECTION:NOTES:BEGIN -->
Evitar cualquier configuración inerte que prometa validaciones no ejecutadas. Cada texto visible por el usuario en la interfaz debe estar respaldado por una clave en los diccionarios bilingües.
<!-- SECTION:NOTES:END -->
