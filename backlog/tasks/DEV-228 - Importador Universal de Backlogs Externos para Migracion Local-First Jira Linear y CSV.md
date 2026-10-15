---
id: DEV-228
title: "Importador Universal de Backlogs Externos para Migración Local-First (Jira, Linear y CSV)"
status: ready
created_date: '2026-10-09'
updated_date: '2026-10-15'
labels:
  - "core"
  - "import"
  - "onboarding"
  - "migration"
  - "local-first"
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extender el sistema de importación para admitir la ingesta de backlogs exportados desde Jira y Linear (archivos CSV y JSON), transformándolos en tareas locales de gripm:
1. **Adopción con cero fricción:** Eliminar la barrera de entrada para equipos existentes que ya tienen tareas en Jira o Linear, permitiendo importar proyectos enteros con un clic o comando sin tipear nada a mano.
2. **Soberanía y privacidad de datos:** El procesamiento de los archivos de exportación se ejecuta 100% en local (en el cliente web y/o CLI). Cero llamadas a APIs de terceros, cero tokens y cero filtración de roadmap a la nube.
3. **Mapeo canónico inteligente:** Normalizar estados, títulos, descripciones y prioridades de Jira/Linear al formato estándar de gripm (`backlog/tasks/*.md` o `.gripm/backlog.json`), extrayendo criterios de aceptación y etiquetas automáticamente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Soporte para parsear exports de Jira en formato JSON y CSV mapeando estados, prioridades y descripciones
- [x] #2 Soporte para parsear exports de Linear en formato CSV y JSON preservando titulos, notas y estimaciones
- [x] #3 ImportWizardModal permite soltar o seleccionar archivos de export con previsualizacion y conteo de tareas antes de confirmar
- [x] #4 Comando CLI gripm import --file <path> para importar directamente desde la terminal
- [x] #5 Cero dependencias de red o llamadas remotas; conversion puramente local
- [x] #6 npm test y npx tsc --noEmit pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Módulo `src/utils/universalImporter.ts`:**
  - Implementación de `parseCsv(text: string): string[][]` nativo compatible con RFC 4180 (manejo de comillas dobles, comas y saltos de línea dentro de campos citados, comillas escapadas `""`, y BOM UTF-8).
  - Detección automática de formato (`detectExportFormat` / `parseUniversalExport`): Jira JSON (`issues`, `fields`), Jira CSV (`Issue key`, `Summary`, etc.), Linear JSON (`identifier`, `state`, `cycle`), Linear CSV (`Identifier`, `Title`, `Estimate`, etc.), CSV genérico y Markdown tradicional.
  - Mapeo canónico de estados (`draft`, `doing`, `review`, `ready`, `done`, `cancelled`), prioridades (`p0`..`p3`), tipos (`bug`, `feature`, `epic`, `tech_debt`, `ux`) y estimaciones.
  - Extracción automática de Criterios de Aceptación desde columnas dedicadas o detectados en la descripción (`- [ ]`, `- [x]`, secciones `Acceptance Criteria`).
  - Serialización estándar a Markdown compatible con Backlog.md vía `formatTaskMarkdown()`.
  - Cero dependencias de red o librerías externas; conversión puramente local.
- **Integración UI en `src/components/ImportWizardModal.tsx`:**
  - Área de arrastrar y soltar (drag & drop) y selector de archivos `.csv`, `.json`, `.md`.
  - Badge visual de origen detectado con conteo de tareas (ej: "Jira CSV detectado: 42 tareas").
  - Previsualización enriquecida con badges de clave original (`originalKey`), estimación (`estimate`), conteo de criterios de aceptación (`AC`), y selectores editables de estado canónico completo y tipo.
- **Subcomando CLI en `bin/gripm.js`:**
  - `gripm import --file <path> [-f <path>] [--repo <dir>] [--prefix <prefix>] [--dry-run]`.
  - Detección automática del esquema y prefijo canónico a partir del repositorio o tareas existentes en `backlog/tasks/`.
  - Generación de archivos atómicos individuales `.md` con sanitización estricta de nombres y numeración correlativa.
<!-- SECTION:NOTES:END -->

