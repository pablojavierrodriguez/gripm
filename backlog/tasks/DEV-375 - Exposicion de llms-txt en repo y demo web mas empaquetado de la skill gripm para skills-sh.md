---
id: DEV-375
title: "Exposicion de llms-txt en repo y demo web mas empaquetado de la skill gripm para skills-sh"
status: draft
created_date: '2026-11-14'
updated_date: '2026-11-14'
labels: ["llms-txt", "skills-sh", "distribution", "marketplace", "epic-3-marketplace-reach"]
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
AI agent directories (`skills.sh`, `LinklyAI/best-skills`, `mcpmarket.com`, `awesomeskill.ai`) index repositories through root `skills/<name>/SKILL.md` paths and machine-readable `llms.txt` files. Currently, `@gripm/board`'s skill lives only at `.agents/skills/gripm/SKILL.md` and neither the repo nor `gripm.vercel.app` serves an `llms.txt` index.

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  - Expose `skills/gripm/SKILL.md` in parity with `.agents/skills/gripm/SKILL.md` so `npx skills add pablojavierrodriguez/gripm` works out of the box on `skills.sh`.
  - Create root `llms.txt` and `public/llms.txt` (served at `https://gripm.vercel.app/llms.txt`) detailing Gripm Board, all MCP tools, CLI commands, and Playbook integration.
  - Update `scripts/verify-publish-surface.js` and `package.json` `files` if needed while keeping npm publish surface clean.
- **Out-of-Scope:**
  - External backlink campaigns.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Root `llms.txt` and `public/llms.txt` exist and document `@gripm/board` capabilities, MCP tools, CLI commands, and installation one-liners.
- [ ] #2 `skills/gripm/SKILL.md` is exposed for `npx skills add` compatibility and kept in parity with `.agents/skills/gripm/SKILL.md`.
- [ ] #3 `npm run publish:check` and `node scripts/verify-changes.js --all` pass with exit code 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Author root `llms.txt` and mirror it to `public/llms.txt` for static hosting on Vercel.
2. Expose `skills/gripm/SKILL.md` aligned with `.agents/skills/gripm/SKILL.md` and add parity check to test/validation scripts.
3. Verify `npm run publish:check`, `npm run build`, and `node scripts/verify-changes.js --all`.
<!-- SECTION:PLAN:END -->
