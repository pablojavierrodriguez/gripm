---
id: DEV-372
title: "Panel visual de Memoria del Proyecto y Decisiones en el Cockpit Web"
status: draft
created_date: '2026-11-14'
updated_date: '2026-11-14'
labels: ["ui", "memory", "cockpit", "epic-1-agent-memory"]
dependencies: ["DEV-371"]
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
Pure CLI memory stores act as black boxes where developers cannot easily see, curate, or delete inaccurate memories recorded by AI agents. Gripm Board has a unique visual advantage (`localhost:4100`) to give humans full transparency and sovereignty over project memory.

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  - Add a Project Memory / Decisions view (or module tab configurable in `.gripm/config.json`) in the web cockpit where users can browse, search, create, edit, pin, or archive entries stored by `gripm_remember`.
  - Include serene empty-state guidance and complete bilingual (`es` / `en`) labels.
- **Out-of-Scope:**
  - Real-time collaborative cloud syncing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Web cockpit renders the Project Memory / Decisions list with search, tag filters, and pin/delete actions backed by local storage API endpoints.
- [ ] #2 Empty state renders a calm neutral state explaining how agents and humans record project decisions via MCP or UI.
- [ ] #3 View complies with all mobile/desktop ergonomics (>= 44x44px touch targets, `createPortal` modals, zero `UX-001`..`UX-020` violations).
- [ ] #4 Headless component and API integration tests pass with exit code 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Expose read/write endpoints for project memory entries in the local backend server (`server/`).
2. Build modular UI components for browsing, filtering, pinning, and editing decisions with calm empty state.
3. Add bilingual dictionary keys and register module visibility in `.gripm/config.json` / Settings.
4. Add headless integration tests and verify `npm run audit:ux:strict` + Verification Pyramid.
<!-- SECTION:PLAN:END -->
