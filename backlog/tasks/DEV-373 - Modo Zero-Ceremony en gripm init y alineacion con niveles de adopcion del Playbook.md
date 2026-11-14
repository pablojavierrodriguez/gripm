---
id: DEV-373
title: "Modo Zero-Ceremony en gripm init y alineacion con niveles de adopcion del Playbook"
status: draft
created_date: '2026-11-14'
updated_date: '2026-11-14'
labels: ["cli", "onboarding", "playbook-sync", "epic-2-frictionless-onboarding"]
dependencies: []
priority: high
type: enhancement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
Developers adopting `@gripm/board` want immediate visual task management and MCP integration without being forced into strict git branching ceremonies (`dev -> main`), mandatory English commit hooks, or blocking refinement bureaucracy on day one.

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  - Align `gripm --init` and `gripm playbook sync` with `@gripm/playbook`'s progressive adoption tiers (`lite`, `standard`, `strict` from `PLAY-078`) and standalone skills (`PLAY-074` / `PLAY-075`).
  - Make the default onboarding frictionless while allowing teams to opt into strict gates when ready.
- **Out-of-Scope:**
  - Removing existing `--full` or `--playbook-preset strict` options for power users.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `gripm --init` offers clear progressive presets (`Lite AI-First`, `Standard Board + Playbook`, `Strict Governance`) with zero-friction defaults.
- [ ] #2 `gripm playbook sync` supports syncing individual skills or slash commands without overwriting local project git rules.
- [ ] #3 CLI onboarding tests verify all presets and flags with exit code 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `gripm --init` onboarding prompts and CLI preset mapping (`lite`, `standard`, `strict`) to pass tier flags cleanly to `@gripm/playbook`.
2. Update `gripm playbook sync` to support selective skill and slash-command synchronization.
3. Update `README.md` and `README.es.md` onboarding docs.
4. Add CLI integration tests verifying each preset and flag combination.
<!-- SECTION:PLAN:END -->
