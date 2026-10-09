---
id: DEV-219
title: "Onboarding CLI con selección de perfiles y add-ons declarativos en init"
status: draft
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "cli"
  - "onboarding"
  - "dx"
  - "scaffold"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evolucionar el asistente de inicialización `gripm --init` (`scripts/initScaffold.js`) para ofrecer perfiles de adopción y selección declarativa de add-ons:
1. **Selección de perfil inicial en CLI:** Ofrecer una primera decisión clara y concisa al usuario:
   - `[1] Minimalista AI-First (Recomendado)`: Núcleo ultraligero con Kanban puro, sin ceremonias ni timeboxes (`methodology: "kanban"`, `enabledTabs.sprint: false`, solo `backlog/tasks/` y `SKILL.md`).
   - `[2] Baterías Incluidas`: Suite completa habilitando Sprints/Scrum, Releases y gobernanza de agentes.
   - `[3] Personalizado`: Permite seleccionar granularmente cada add-on (Sprints, Releases, AGENTS.md, scripts en package.json, etc.).
2. **Generación explícita de `.gripm/config.json`:** El archivo de configuración resultante debe persistir explícitamente `methodology` y `enabledTabs`, eliminando ambigüedades o fallbacks implícitos en el arranque del servidor.
3. **Flags no interactivas (`--minimal`, `--full`):** Soporte en CLI para flags de automatización en scripts o CI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 scripts/initScaffold.js presenta selector de perfiles de inicializacion (Minimalista AI-First, Baterias Incluidas, Personalizado)
- [ ] #2 El perfil Minimalista AI-First configura methodology kanban y enabledTabs.sprint false sin crear archivos innecesarios
- [ ] #3 .gripm/config.json persiste explicitamente methodology y enabledTabs segun la eleccion del usuario
- [ ] #4 Soporte para flags no interactivas (--minimal, --full) en el comando gripm --init
- [ ] #5 npm test y npm run backlog:check pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Mantener compatibilidad con flags existentes (--lang, --mode, --yes).
<!-- SECTION:NOTES:END -->
