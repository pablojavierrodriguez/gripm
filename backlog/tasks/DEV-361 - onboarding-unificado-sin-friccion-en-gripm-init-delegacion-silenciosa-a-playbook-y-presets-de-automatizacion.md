---
id: DEV-361
title: "Onboarding unificado sin friccion en gripm --init: delegacion silenciosa a Playbook y presets de automatizacion"
status: ready
created_date: '2026-11-02'
updated_date: '2026-11-04'
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

## [TECH ARCHITECTURE]

- `scripts/init/playbookOptions.js` derives choices from the installed Playbook catalog and validates wizard and CLI selections before writing Board files.
- `scripts/init/prompts.js` collects granular choices inside Gripm's existing readline session; `scripts/initScaffold.js` coordinates quick, granular, Board-only, and Playbook-only paths.
- `scripts/init/playbookDelegate.js` serializes validated selections into Playbook's native init flags. Combined setup is non-interactive at the delegation boundary; Playbook-only interactive setup retains its native wizard.
- `scripts/init/writers.js` stores combined `preset` and `automation` values at the top level without discarding existing Board settings. Delegation failures return an unsuccessful result and non-zero CLI status without rollback.

## [QA MATRIX]

### Acceptance criteria review

- AC #1: PASS. Quick setup tests verify `--yes`, `--mode quick`, pragmatic/automated defaults, and every harness in the installed Playbook catalog for both Board presets.
- AC #2: PASS. The single Gripm granular prompt collects all seven Playbook selections; tests verify all catalog harnesses are preselected, empty harnesses are rejected before Board config is written, and other artifact lists may be empty.
- AC #3: PASS. Tests verify Board-only does not invoke Playbook; Playbook-only `--yes` selects all supported harnesses without Board config, and its interactive delegation leaves the native wizard enabled.
- AC #4: PASS. CLI parser/delegation tests verify the namespaced `--playbook-*` arguments and preserve Board's existing `--scripts` behavior.
- AC #5: PASS. Combined setup persists top-level `preset` and `automation`, preserves existing Board settings, and leaves unrelated user files intact.
- AC #6: PASS. Delegated non-zero exits are explicit, return failure/non-zero CLI status, and preserve Board files. Spawn errors follow the same failure path in `scripts/init/playbookDelegate.js`.
- AC #7: PASS. `scripts/test-init-suite.js` covers quick, granular, Board-only, Playbook-only, argument mapping, empty harness rejection, persistence, wizard behavior, and delegated failure.
- AC #8: PASS. All required commands below passed.

### Verification Pyramid

| Step | Exact command | Result |
| --- | --- | --- |
| 1. Typecheck | `npm run lint` | PASS, exit 0 |
| 2. Headless tests | `npm test` | PASS, exit 0 |
| 2. Platform tests | `npm run test:linux` | PASS, exit 0 |
| 3. Backlog consistency | `npm run backlog:check` | PASS, exit 0; backlog synchronized |
| 3. Publish surface | `npm run publish:check` | PASS, exit 0 |
| 3. Change verification | `npm run verify:changes -- --all` | PASS, exit 0; 656 files checked. YAML checks reported unavailable because Python/PyYAML is not installed. |
| 4. LOC/modularity | `npx playbook check-loc` | PASS, exit 0; no scanned source file at the 1000 LOC ceiling. Advisory warnings remain. |
| 4. Repository health | `gripm_get_repo_health(projectId: "gripm", category: "all")` | PASS; 32/100, matching the task's 32/100 baseline. Existing repository LOC debt remains; no changed source file reaches 1000 LOC. |
| 5. Static UX | `npx playbook audit --strict` | PASS, exit 0; 0 findings, 159 accepted baseline observations. |
| 6. Production build | `npm run build` | PASS, exit 0; Vite and standalone binaries built. |
| Final gate | `node node_modules/@gripm/playbook/scripts/gate-qa.mjs DEV-361` | PASS, exit 0; gate promoted `review` → `ready`. |

### Findings and verdict

- No blocking AC or verification findings.
- LOC checks report advisory repository debt only; no modified source file reaches the 1000 LOC ceiling. Browser testing is not applicable to this CLI-only change; the setup paths are covered headlessly.
- Verdict: `[ APPROVED → ready ]`.
