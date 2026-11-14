---
id: DEV-374
title: "Autoconfiguracion multi-harness de gripm-mcp y skills para Claude Code Cursor Windsurf Copilot y OpenCode"
status: draft
created_date: '2026-11-14'
updated_date: '2026-11-14'
labels: ["mcp", "onboarding", "harnesses", "dx", "epic-2-frictionless-onboarding"]
dependencies: ["DEV-373"]
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
### Problem Statement
Configuring `gripm-mcp` today requires users to manually copy-paste JSON blocks into `.mcp.json`, `.cursor/mcp.json`, or Claude Desktop config files. Competing configurators like `gentle-ai` automatically detect and wire MCP servers and skills into all installed coding agents in a single step.

### Bounded Scope & Decisions (Gate R1)
- **In-Scope:**
  - Add non-destructive MCP and skill auto-configuration in `gripm --init` (and `gripm mcp --setup`) that detects and writes/merges project-level MCP configuration files (`.mcp.json` for Claude Code, `.cursor/mcp.json` for Cursor, `.vscode/mcp.json` for VS Code Copilot, OpenCode config) while preserving existing MCP servers.
- **Out-of-Scope:**
  - Modifying OS-global configuration files outside the repository without explicit `--global` confirmation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `gripm --init` and `gripm mcp --setup` can generate or non-destructively merge `gripm-mcp` entries into `.mcp.json`, `.cursor/mcp.json`, and `.vscode/mcp.json`.
- [ ] #2 Existing third-party MCP servers in those configuration files are preserved intact.
- [ ] #3 Integration tests verify idempotent JSON merge and multi-harness setup across supported clients.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Design idempotent JSON config merger helper for `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, and OpenCode MCP declarations.
2. Expose `gripm mcp --setup` subcommand and wire multi-harness selection into `gripm --init`.
3. Add unit and CLI integration tests covering merge idempotency and preservation of existing servers.
4. Run full Verification Pyramid (`tsc`, `npm test`, `build`).
<!-- SECTION:PLAN:END -->
