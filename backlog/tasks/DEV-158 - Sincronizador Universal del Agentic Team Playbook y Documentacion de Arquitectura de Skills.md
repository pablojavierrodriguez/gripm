---
id: DEV-158
title: "Sincronizador Universal del Agentic Team Playbook y Documentacion de Arquitectura de Skills"
status: done
created_date: '2026-10-04'
updated_date: '2026-10-04'
labels:
  - "playbook"
  - "cli"
  - "documentation"
  - "tooling"
dependencies: []
priority: medium
type: feature
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Incorporar soporte de primera clase en gripm para sincronizar y operacionalizar el Agentic Team Playbook preservando las configuraciones del proyecto:
1. **Script de sincronización universal (`scripts/sync-playbook.mjs`):** Descarga e instala las skills canónicas y directivas desde upstream (`pablojavierrodriguez/agentic-team-playbook`), bajo el principio de separación de capas (Framework vs Proyecto), garantizando que `AGENTS.md` y `backlog/` nunca se sobreescriban.
2. **Subcomando CLI `gripm playbook sync`:** Añadido en `bin/gripm.js` y `bin/devboard.js` para que cualquier repositorio (sea Node, Python, Go, Rust, etc.) pueda ejecutar `npx gripm playbook sync`.
3. **Script de conveniencia en `package.json`:** `"playbook:sync": "node scripts/sync-playbook.mjs"`.
4. **Documentación de arquitectura ("Under the Hood"):** Actualización de `docs/AGENTIC_PLAYBOOK.md` explicando por qué los agentes son skills modulares con *role-swapping* y *progressive disclosure* en lugar de enjambres asíncronos (swarms), agregando matriz comparativa y guía de sincronización de capas.
5. **Tip Pro en READMEs:** Actualización de `README.md` y `README.es.md` con el comando universal de sincronización.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Script `scripts/sync-playbook.mjs` implementado con manejo defensivo de red y preservación estricta de `AGENTS.md`
- [x] #2 Subcomando `gripm playbook sync` operativo y documentado en `--help` de los binarios CLI
- [x] #3 Script `playbook:sync` agregado en `package.json`
- [x] #4 `docs/AGENTIC_PLAYBOOK.md` actualizado con sección de arquitectura de skills vs swarms y separación de capas
- [x] #5 Referencias y pro tips agregados en `README.md` y `README.es.md`
- [x] #6 Pirámide de verificación validada (`tsc`, `npm test`, `npm run backlog:check`, `npm run build`) con código de salida 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear `scripts/sync-playbook.mjs` con descarga canónica y preservación de capas de proyecto.
2. Integrar subcomando `playbook sync` en `bin/devboard.js` y `bin/gripm.js`.
3. Añadir script `playbook:sync` en `package.json`.
4. Actualizar `docs/AGENTIC_PLAYBOOK.md` con secciones de arquitectura ("Under the Hood") y separación de capas.
5. Actualizar `README.md` y `README.es.md` con atajos y pro tips.
6. Sincronizar consolidado `BACKLOG.md` mediante `npm run backlog:sync` y validar pirámide de verificación.
<!-- SECTION:PLAN:END -->
