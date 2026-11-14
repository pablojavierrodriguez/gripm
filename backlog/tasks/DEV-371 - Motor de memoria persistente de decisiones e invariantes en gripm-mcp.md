---
id: DEV-371
title: "Motor de memoria persistente de decisiones e invariantes en gripm-mcp"
status: draft
created_date: '2026-11-14'
updated_date: '2026-11-14'
labels: ["mcp", "memory", "context", "epic-1-agent-memory"]
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
A primary driver behind the adoption of tools like `gentle-ai` (`Engram`) and `LinklyAI` is solving AI agent amnesia across sessions and after context compaction. While `gripm-mcp` excels at managing backlog tasks (`backlog/tasks/*.md`), agents currently have no lightweight MCP tool in Gripm to persist and query architectural decisions, root-cause bug learnings, and domain invariants across sessions without reading dozens of task files.

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  - Add local-first project memory persistence in `.gripm/memory.json` (and optional Markdown decision records under `backlog/decisions/*.md`).
  - Expose two token-efficient MCP tools in `scripts/mcp-server.ts`:
    - `gripm_remember`: record or update a categorized decision, bug learning, or domain invariant with tags and related file paths.
    - `gripm_recall`: search and retrieve compact relevant memories by keyword query, tag, or file path.
  - Update `.agents/skills/gripm/SKILL.md` so agents automatically consult and record high-value decisions across sessions.
- **Out-of-Scope:**
  - External vector databases, cloud embeddings, or compiled native binaries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `scripts/mcp-server.ts` exposes `gripm_remember` and `gripm_recall` tools with strict input validation and atomic disk writes.
- [ ] #2 `gripm_recall` supports keyword, tag, and file-path filtering with a compact token-efficient output format.
- [ ] #3 `.agents/skills/gripm/SKILL.md` documents when and how agents use `gripm_remember` and `gripm_recall` across sessions.
- [ ] #4 `bin/gripm-mcp.js` is rebuilt via `npm run build:bin` and headless MCP integration tests verify memory creation, retrieval, and persistence.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Design storage schema for project decisions and invariants (`.gripm/memory.json` / `backlog/decisions/`) using `atomicWriteFileSync`.
2. Implement `gripm_remember` and `gripm_recall` handlers and schema definitions in `scripts/mcp-server.ts`.
3. Update `.agents/skills/gripm/SKILL.md` and `README.md` MCP tool count/docs.
4. Rebuild `bin/gripm-mcp.js` via `npm run build:bin` and add headless MCP tests.
<!-- SECTION:PLAN:END -->
