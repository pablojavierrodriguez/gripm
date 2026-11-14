---
id: DEV-361
title: "Onboarding unificado sin friccion en gripm --init: delegacion silenciosa a Playbook y presets de automatizacion"
status: done
created_date: '2026-11-02'
updated_date: '2026-11-14'
labels:
  - "cli"
  - "onboarding"
  - "dx"
  - "modular"
dependencies:
  - "DEV-360"
priority: high
type: feature
milestone: "v1.12.0"
estimate: 3
claimed_by: "copilot:db2bad02-4e8a-4cc5-a4e1-208400ba01ff"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
When users initialize Gripm Board and Playbook together, Gripm collects setup choices and then starts a second interactive Playbook wizard without passing those choices. This repeats questions and can make the generated repository differ from the user's selections. Users need one coherent setup flow for the combined products, and the Playbook-only path must retain its existing single native wizard.

### Cross-Project Dependency
- **Requiere en `@gripm/playbook`:** `PLAY-058` (soporte de flags `--rules`, `--preset` y modularidad completa en `playbook init`).

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  1. Support Board-only, Playbook-only, and Board + Playbook initialization without invoking or prompting Playbook when Board-only is selected, or introducing duplicate prompts in the other paths.
  2. In quick/non-interactive initialization, apply `pragmatic` rigor and `automated` delivery mode, with every harness supported by the installed Playbook package selected. No single harness is privileged.
  3. In granular initialization, preselect every harness supported by Playbook and allow users to change harnesses, skills, rules, scripts, docs, rigor, and automation in one pass. Selecting no harness is rejected explicitly; empty selections for the other artifact lists are permitted.
  4. Persist `preset` and `automation` as top-level `.gripm/config.json` values whenever Board + Playbook are initialized together. In Playbook-only mode, Playbook remains responsible for its config.
  5. If Playbook delegation fails, report the failure and return a non-zero CLI result while preserving already-written Board files; do not silently claim full success or roll back user files.
  6. Keep supported harnesses sourced from the installed Playbook catalog. VS Code Copilot, OpenCode, and explicit no-harness support are tracked separately in `PLAY-062`.
- **Out-of-Scope:**
  - Adding or changing harness adapters in `@gripm/playbook`.
  - Modifying the web Cockpit onboarding UI.
  - Deleting or rolling back Board files after a Playbook failure.
- **Decisions:**
  - Playbook 2.9.1 supports Antigravity, Cursor, and Claude Code. Gripm must not hardcode Antigravity as the product default.
  - Quick mode passes the selected bundle non-interactively using Playbook's CLI flags; granular mode collects choices in Gripm and passes them to Playbook once.
  - In Playbook-only interactive mode, retain Playbook's native wizard as the sole wizard. For non-interactive `--yes`, use all currently supported harnesses.
  - Existing Gripm `--scripts` means Board package scripts. New CLI overrides for Playbook use the `--playbook-*` namespace to avoid ambiguity.
  - The repository health baseline is 32/100 with pre-existing LOC violations; source changes remain isolated to the CLI init modules and tests, with no growth to files at or above 1000 LOC.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Quick mode for both Board presets initializes Board + Playbook without a second wizard, passes `--yes --mode quick --preset pragmatic --automation automated`, and selects all harnesses exposed by the installed Playbook catalog.
- [x] #2 Granular combined setup presents the available Playbook harnesses, skills, rules, scripts, docs, rigor, and automation in one Gripm wizard, with all available harnesses initially selected; an empty harness selection is rejected before delegation.
- [x] #3 Board-only setup does not invoke Playbook; Playbook-only interactive setup invokes only Playbook's native wizard, while Playbook-only `--yes` passes all supported harnesses and creates no Board-owned config.
- [x] #4 The delegate passes selected values to Playbook CLI flags, and new Gripm command-line overrides use `--playbook-*` names without changing the existing Board `--scripts` behavior.
- [x] #5 Combined setup persists top-level `preset` and `automation` in `.gripm/config.json`; other Board config fields and existing user files remain intact.
- [x] #6 A Playbook spawn or non-zero exit returns an explicit failure and non-zero Gripm CLI result while preserving Board files already written.
- [x] #7 `scripts/test-init-suite.js` covers quick, granular, Board-only, Playbook-only, argument mapping, empty harness rejection, persistence, no duplicate prompts, and delegated failure.
- [x] #8 `npm run lint`, `npm test`, `npm run backlog:check`, `npm run test:linux`, `npm run publish:check`, `npm run build`, and `npm run verify:changes -- --all` pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep boundaries explicit: `scripts/init/prompts.js` collects typed selections; `scripts/initScaffold.js` coordinates one setup flow; `scripts/init/playbookDelegate.js` translates selections into the Playbook CLI contract; `scripts/init/writers.js` persists the combined Board configuration.
2. Resolve supported harnesses from the installed Playbook catalog, define and parse `--playbook-*` overrides, and map quick and granular choices to validated Playbook arguments.
3. Make delegated failures visible to `gripm-runner.js` as non-zero CLI results without removing Board files.
4. Extend `scripts/test-init-suite.js` through the existing `GRIPM_PLAYBOOK_CLI` seam; validate prompt counts, arguments, persistence, and failures.
5. Run the Gripm verification pyramid, including `npm run test:linux` and the standalone build.
<!-- SECTION:PLAN:END -->
