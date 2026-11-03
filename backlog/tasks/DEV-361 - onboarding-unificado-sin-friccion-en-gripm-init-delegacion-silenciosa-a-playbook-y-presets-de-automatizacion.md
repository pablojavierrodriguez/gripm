---
id: DEV-361
title: "Onboarding unificado sin friccion en gripm --init: delegacion silenciosa a Playbook y presets de automatizacion"
status: draft
created_date: '2026-11-02'
updated_date: '2026-11-02'
labels:
  - "cli"
  - "onboarding"
  - "dx"
  - "modular"
dependencies:
  - DEV-360
priority: high
type: feature
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
Cuando un usuario ejecuta `gripm --init` y selecciona instalar la suite completa (`Gripm Board + Gripm Playbook`), `scripts/initScaffold.js` realiza su propio interrogatorio interactivo y luego invoca `delegatePlaybookInit` (`scripts/init/playbookDelegate.js`) con `stdio: 'inherit'` sin pasarle las decisiones ya tomadas (modo `quick` vs `custom`, selección de skills, scripts, plantillas, harnesses y nivel de rigor). Esto provoca un **doble interrogatorio redundante** en consola y fricción inmediata en el onboarding.

Además, el usuario necesita poder elegir entre:
1. **Automatización Total con Gestión por Excepción (Default):** Los agentes operan el flujo y las compuertas mecánicamente de punta a punta y solo escalan al humano ante ambigüedades de negocio (Gate R1) o violaciones de arquitectura.
2. **Modo Personalizado / Manual Consciente:** Donde el usuario elige exactamente qué módulos del Board, qué skills/reglas del Playbook y qué nivel de rigor (`pragmatic` vs `strict`) activar, o si prefiere control manual de transiciones con advertencia explícita de sus implicancias.

### Cross-Project Dependency
- **Requiere en `@gripm/playbook`:** `PLAY-058` (soporte de flags `--rules`, `--preset` y modularidad completa en `playbook init`).

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  1. Unificar la recolección de opciones en `scripts/initScaffold.js` / `scripts/init/prompts.js` para que si el usuario elige `Modo Rápido`, `delegatePlaybookInit` se ejecute **100% automatizado sin repreguntar** (`--yes`, `--mode quick`, `--lang`, `--name`, `--preset pragmatic`, `--no-board`).
  2. Si el usuario elige `Control Total (Componente por Componente)` e incluye Playbook, permitirle seleccionar en el mismo flujo unificado qué Harnesses (`antigravity`, `cursor`, `claude`), qué Roles/Skills, qué Reglas (`team-playbook`, `state-machine`, `git-workflow`), qué Nivel de Rigor (`pragmatic` vs `strict`) y si desea automatización completa o modo manual, pasando todas las flags resueltas a `delegatePlaybookInit`.
  3. Persistir en `.gripm/config.json` el perfil de automatización y rigor elegido.
- **Out-of-Scope:**
  - Modificar la UI web del Cockpit para el onboarding CLI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 En `Modo Rápido` (`Minimalist AI-First` o `Batteries Included`), seleccionar `Board + Playbook` ejecuta la instalación completa en una sola pasada sin abrir un segundo prompt interactivo en `delegatePlaybookInit`.
- [ ] #2 En `Modo Componente por Componente`, el usuario puede elegir granularmente módulos del Board, roles/skills del Playbook, reglas de gobernanza, preset de rigor (`pragmatic` vs `strict`) y modo de automatización (automatizado por excepción vs manual con aviso de implicancias).
- [ ] #3 `scripts/init/playbookDelegate.js` traduce y pasa todas las opciones seleccionadas (`--harness`, `--skills`, `--rules`, `--scripts`, `--docs`, `--preset`, `--yes`) al binario de `@gripm/playbook`.
- [ ] #4 `scripts/test-init-suite.js` valida que la inicialización combinada `Board + Playbook` tanto en modo rápido como granular respete exactamente la selección del usuario sin prompts duplicados.
- [ ] #5 La Pirámide de Verificación pasa con código 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Actualizar `scripts/init/playbookDelegate.js` para recibir y serializar `harnesses`, `skills`, `rules`, `scripts`, `docs` y `preset` como argumentos CLI con `--yes`.
2. Integrar en `scripts/initScaffold.js` y `scripts/init/prompts.js` la selección de opciones de Playbook dentro del mismo wizard cuando `installPlaybook === true`.
3. Ampliar `scripts/test-init-suite.js` y verificar con `npm test`.
<!-- SECTION:PLAN:END -->
