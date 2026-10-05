---
id: DEV-179
title: "Alineación de Playbook Upstream a gripm-playbook y Preservación de gripm como Repositorio Insignia"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-05'
labels:
  - "branding"
  - "playbook"
  - "dx"
  - "ecosystem"
dependencies:
  - DEV-121
  - DEV-149
  - DEV-158
priority: high
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Alinear las referencias y automatizaciones de sincronización del Playbook tras su renombramiento canónico a `gripm-playbook` (`pablojavierrodriguez/gripm-playbook`), preservando a `gripm` como el repositorio insignia (*flagship*) único y unificado del ecosistema.

**Decisión de Arquitectura de Ecosistema:**
1. **`gripm` (este repositorio):** Es el producto estrella integral (*batteries-included*). Contiene el cockpit visual, motor Markdown, servidor MCP, CLI global y las skills canónicas del playbook ya integradas y sincronizadas. No requiere renombrarse a `gripm-board`, conservando la máxima simplicidad y peso de marca (`github.com/pablojavierrodriguez/gripm`).
2. **`gripm-playbook`:** Existe como repositorio desacoplado e independiente para usuarios y proyectos (Python, Go, Rust, etc.) que desean adoptar la metodología, roles y skills de agentes sin clonar ni depender del stack del cockpit.
3. **Sincronización:** Se actualiza el sincronizador (`scripts/sync-playbook.mjs`), la documentación (`docs/AGENTIC_PLAYBOOK.md`) y los badges del proyecto (`README.md`, `README.es.md`) para consumir desde el nuevo upstream `pablojavierrodriguez/gripm-playbook`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Actualizar DEFAULT_REMOTE en scripts/sync-playbook.mjs apuntando a pablojavierrodriguez/gripm-playbook
- [x] #2 Actualizar enlace a upstream en docs/AGENTIC_PLAYBOOK.md hacia pablojavierrodriguez/gripm-playbook
- [x] #3 Actualizar badges y referencias de metodología en README.md y README.es.md reflejando gripm-playbook
- [x] #4 Preservar la identidad canónica soberana de gripm como repositorio insignia (package.json, binarios, CI/CD) sin fragmentación innecesaria
- [x] #5 Verificar que la suite unificada de calidad (tsc, npm test, backlog:check, publish:check) pase con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Actualizar `scripts/sync-playbook.mjs` con `DEFAULT_REMOTE = 'pablojavierrodriguez/gripm-playbook'`.
2. Actualizar `docs/AGENTIC_PLAYBOOK.md` con el enlace canónico a `gripm-playbook`.
3. Actualizar badges en `README.md` y `README.es.md` a `gripm-playbook`.
4. Revertir cambios de nombres de repo a `gripm-board`, asegurando que `package.json`, binarios y URLs se mantengan en `gripm`.
5. Ejecutar `npm run backlog:sync` y pasar la pirámide de verificación completa.
<!-- SECTION:PLAN:END -->
