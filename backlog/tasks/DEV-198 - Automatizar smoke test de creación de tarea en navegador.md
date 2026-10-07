---
id: DEV-198
title: "Automatizar smoke test de creación de tarea en navegador"
status: ready
created_date: '2026-10-06'
updated_date: '2026-10-06'
labels:
  - "bug"
  - "testing"
  - "ui"
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La suite de CI no ejercita un flujo real de navegador para los caminos principales del usuario. Un error de orden de hooks impedía abrir el modal de nueva tarea aunque los tests existentes pasaban. Incorporar un smoke test automatizado y acotado que levante Gripm en un repo temporal, confirme que el logo carga, abra el modal, cree una tarea y verifique su persistencia.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Un test automatizado inicia el CLI contra un proyecto temporal aislado
- [x] #2 El navegador confirma que el logo es visible y se cargó sin error
- [x] #3 El test abre el modal, crea una tarea y verifica la persistencia en el repo
- [x] #4 El test falla si la consola registra errores fatales o la UI muestra el ErrorBoundary
- [x] #5 El smoke test corre en CI y se puede ejecutar localmente con un comando documentado
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- El smoke aislado corre con `npm run test:ui`; instala Chromium localmente con `npx playwright install chromium`.
- CI ejecuta este flujo en un job dedicado de Ubuntu usando `npx playwright install --with-deps chromium`.
- El proceso usa directorios temporales y `GRIPM_HOME` aislado; no registra el proyecto en el perfil personal.
<!-- SECTION:NOTES:END -->
