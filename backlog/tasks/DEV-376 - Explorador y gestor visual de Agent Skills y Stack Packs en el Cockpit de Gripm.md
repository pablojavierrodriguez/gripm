---
id: DEV-376
title: "Explorador y gestor visual de Agent Skills y Stack Packs en el Cockpit de Gripm"
status: draft
created_date: '2026-11-14'
updated_date: '2026-11-14'
labels: ["ui", "skills", "settings", "cockpit", "epic-3-marketplace-reach"]
dependencies: ["DEV-373"]
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
Users managing a repository with Gripm Board have no visual surface to see which Agent Skills, Stack Packs (`nextjs`, `react`, `node-api`, `testing`, `mobile`, `pwa`), Slash Commands, and Harnesses are currently installed in `.agents/` or `.claude/`, nor to toggle them without memorizing CLI flags.

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  - Add an "Agent Skills & Harnesses" section in Settings / Diagnostics within the Gripm Board UI that lists installed skills, active governance tier (`lite`, `standard`, `strict`), and configured harnesses.
  - Allow syncing or toggling stack packs safely via the local backend.
- **Out-of-Scope:**
  - Remote execution of unvetted third-party scripts from arbitrary URLs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Settings / Diagnostics view displays installed skills (`.agents/skills/` and `.claude/`), active governance preset, and configured AI harnesses.
- [ ] #2 Users can trigger stack pack synchronization or preset updates safely from the local cockpit UI.
- [ ] #3 UI passes strict static UX audit (`npm run audit:ux:strict`) and headless component tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add local backend endpoints to inspect installed skills, harnesses, and `.gripm/playbook-lock.json` state, and run safe Playbook stack syncs.
2. Build the "Agent Skills & Harnesses" UI section inside Settings / Diagnostics following design system tokens and bilingual labels.
3. Add headless component and API tests, then verify `npm run audit:ux:strict` and Verification Pyramid.
<!-- SECTION:PLAN:END -->
