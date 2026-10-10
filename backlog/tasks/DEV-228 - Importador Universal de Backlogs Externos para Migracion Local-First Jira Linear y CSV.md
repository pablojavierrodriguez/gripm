---
id: DEV-228
title: "Importador Universal de Backlogs Externos para Migración Local-First (Jira, Linear y CSV)"
status: draft
created_date: '2026-10-09'
updated_date: '2026-10-09'
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
- [ ] #1 Soporte para parsear exports de Jira en formato JSON y CSV mapeando estados, prioridades y descripciones
- [ ] #2 Soporte para parsear exports de Linear en formato CSV y JSON preservando titulos, notas y estimaciones
- [ ] #3 ImportWizardModal permite soltar o seleccionar archivos de export con previsualizacion y conteo de tareas antes de confirmar
- [ ] #4 Comando CLI gripm import --file <path> para importar directamente desde la terminal
- [ ] #5 Cero dependencias de red o llamadas remotas; conversion puramente local
- [ ] #6 npm test y npx tsc --noEmit pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reutilizar y extender la infraestructura existente en `ImportWizardModal.tsx` y `src/utils/legacyParser.ts`.
<!-- SECTION:NOTES:END -->
