---
name: gripm
description: gripm (formerly DevBoard) skill for agile management and Backlog.md. Guides AI agents and LLMs (Antigravity, Cursor, Claude Code) to query, pick, update, plan, and complete backlog tasks using the MCP server or native Markdown files.
---

# gripm / DevBoard Agent Skill

This skill instructs AI agents and LLMs to interact with **gripm** (*"grip-em"*), the local agile cockpit and execution engine compatible with the **Backlog.md** standard.

---

## 1. MCP Server Configuration

gripm includes a standalone MCP server over `stdio` (`bin/gripm-mcp.js` with backward-compatible alias `bin/devboard-mcp.js`). To integrate it with Antigravity, Cursor, or Claude Code:

### Option A: Via npm run (Recommended in this repository)
```json
{
  "mcpServers": {
    "gripm": {
      "command": "npm",
      "args": ["run", "mcp"]
    }
  }
}
```

### Option B: Via global binary (if installed with `npm install -g gripm`)
```json
{
  "mcpServers": {
    "gripm": {
      "command": "gripm-mcp"
    }
  }
}
```

### Option C: Via direct npx
```json
{
  "mcpServers": {
    "gripm": {
      "command": "npx",
      "args": ["-y", "-p", "@gripm/board", "gripm-mcp"]
    }
  }
}
```

---

## 2. Available MCP Tools

| Tool | Purpose | Key Parameters |
| :--- | :--- | :--- |
| **`gripm_list_tasks`** | Lists tasks in the active project. Supports compact token-efficient filtering. | `openOnly`, `status`, `format`, `search`, `priority` |
| **`gripm_get_task`** | Reads full task details and acceptance criteria. | `taskId` (e.g. `"DEV-001"`) |
| **`gripm_create_task`** | Creates a new task in the backlog. | `title`, `description`, `type`, `priority`, `acceptanceCriteria` |
| **`gripm_update_task`** | Updates status, plan, or ticks acceptance criteria (AC). | `taskId`, `status`, `toggleAcIndex`, `implementationPlan` |
| **`gripm_sync_backlog`** | Audits and reconciles out-of-sync tasks with acceptance criteria. | `autoFix` |
| **`gripm_get_stats`** | Gets project health and progress metrics. | None |

---

## 3. Agent Interaction Rules
1. Dogfooding: Every code modification must be linked to a task in `backlog/tasks/`.
2. Move task to `doing` before writing code.
3. Check acceptance criteria step by step with `gripm_update_task`.
4. Terminal development state is `ready` (never promote to `done` autonomously).
