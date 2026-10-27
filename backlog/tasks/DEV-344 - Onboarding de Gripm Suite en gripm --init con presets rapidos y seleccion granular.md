---
id: DEV-344
title: "Onboarding de Gripm Suite en gripm --init con presets rapidos y seleccion granular"
status: ready
created_date: '2026-10-26'
updated_date: '2026-10-26'
labels:
  - "cli"
  - "onboarding"
  - "suite"
  - "dx"
  - "config"
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evolucionar el asistente de inicializacion `gripm --init` (`scripts/initScaffold.js` y `scripts/gripm-runner.js`) hacia la arquitectura de Gripm Suite definida en DEV-205, bajo el principio de "100% ofrecido, 0% impuesto", sin alargar la experiencia del usuario y con soporte para dos velocidades de configuracion:

1. **Vision de Suite en el Onboarding:**
   - Presentar Gripm como una suite de productos de trabajo con agentes y desarrollo agil (hoy: Gripm Board & MCP y Gripm Playbook; extensible a futuros productos `@gripm/*`).
   - Permitir al usuario elegir que productos de la suite inicializar en su repositorio en una sola interaccion.

2. **Dos Velocidades de Configuracion:**
   - **Modo Rapido ("Elegir por mi"):** Presets en 1 clic (`Minimalist AI-First`, `Baterias Incluidas`) o flags no interactivas (`--minimal`, `--full`, `--yes`). Muestra una radiografia compacta de lo que queda activo (`[ON]`) y lo que queda apagado (`[OFF]`) disponible en Settings, ejecutandose en menos de 10 segundos.
   - **Modo Componente por Componente ("Control total"):** Organizado en selectores multiples compactos (`multi-select`) en lugar de preguntas secuenciales `S/n` interminables.

3. **Catalogo Completo y Transparente del Cockpit:**
   - Exponer en el multi-select del Cockpit todas las capacidades disponibles que hoy quedan ocultas o forzadas:
     - Modulos funcionales: Releases, Sprints, Timeline / Roadmap, Metrics / Analytics, Ideas / Discovery, Estimacion (Fibonacci / T-Shirt), Calendar Export (.ics), Multi-Repo Hub.
     - Persistir explicitamente en `.gripm/config.json` el arbol `modules`, `enabledTabs`, `kanban` y `estimation` sin ambiguedades ni fallbacks magicos.

4. **Integracion Transparente en el Repositorio (Opt-in granular):**
   - El usuario decide que artefactos tocar en su repo: `.gripm/config.json`, skill de conexion `.agents/skills/gripm/SKILL.md`, guia `AGENTS.md`, scripts en `package.json` (`"board"`, `"mcp"`) y reglas en `.gitignore`.

5. **Interoperabilidad con Gripm Playbook:**
   - Si el usuario selecciona Gripm Playbook en el onboarding, delegar en el flujo interactivo de Playbook (o invocar `npx @gripm/playbook init` / sincronizador) respetando la seleccion de Harnesses (`Antigravity`, `Cursor`, `Claude Code`) y Stack Packs en lugar de imponer una sincronizacion a ciegas con `--yes`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 scripts/initScaffold.js presenta selector de suite (Gripm Board + MCP y Gripm Playbook) permitiendo instalar uno, ambos o ninguno de forma independiente.
- [x] #2 El selector de modo ofrece 'Modo Rapido (Minimal AI-First o Baterias Incluidas)' y 'Modo Componente por Componente (Control total)'.
- [x] #3 El modo Rapido finaliza en menos de 3 pasos e imprime un resumen claro de capacidades activas e inactivas antes de escribir en disco.
- [x] #4 El modo Componente por Componente utiliza prompts multi-select para seleccionar modulos del Cockpit (Releases, Sprints, Timeline, Metrics, Ideas, Estimation, Calendar, Hub) y archivos en disco.
- [x] #5 .gripm/config.json persiste explicitamente la configuracion resultante (modules, enabledTabs, kanban, estimation) de acuerdo a la seleccion del usuario.
- [x] #6 La seleccion de Gripm Playbook dentro de gripm --init respeta la seleccion interactiva de harnesses y stack packs de Playbook sin forzar defaults a ciegas.
- [x] #7 Las flags no interactivas (--minimal, --full, --yes, --with-playbook, --no-playbook) conservan paridad y automatizacion en CI.
- [x] #8 La suite de pruebas y verificacion de backlog aprueba con codigo 0 (npm test y npm run backlog:check).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Adaptar el flujo de preguntas en `scripts/initScaffold.js` implementando el selector de Suite y los prompts multi-select para componentes.
2. Actualizar la construccion y guardado de `.gripm/config.json` para reflejar todas las capacidades del Cockpit de forma explicita.
3. Conectar la invocacion de `@gripm/playbook` para soportar la seleccion interactiva de harnesses y stack packs.
4. Actualizar pruebas en `scripts/verify-resilience-and-cli.js` o tests dedicados de init.
5. Ejecutar la Piramide de Verificacion y sincronizar el backlog.
<!-- SECTION:PLAN:END -->
