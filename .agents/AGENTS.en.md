# AI Agent Contribution Guide (AGENTS.md)

Welcome to **{{projectName}}**. When working on this repository, AI agents (Antigravity, Cursor, Claude Code) and human developers must strictly adhere to the following guidelines:

## 1. Dogfooding and Living Backlog
- **Every code modification must be associated with a task in `backlog/tasks/`**.
- Move the task to `doing` before writing code.
- Check acceptance criteria (`- [x]`) live as they are completed.
- **Canonical Limit of Development: Only up to `ready`**. The agent NEVER promotes a task to `done` during the sprint. The `ready` status (Ready for Release) is the terminal development state in a sprint.
- The `done` status belongs exclusively to formally released versions.
- Include the task `.md` file in the same commit as the code changes.

## 2. gripm MCP Server
Use gripm tools (`gripm-mcp` or `npm run mcp`):
- `gripm_list_tasks`: Token-efficient task listing and filtering.
- `gripm_get_task`: Read full task details and acceptance criteria.
- `gripm_update_task`: Update status, plan, and check criteria sequentially.
- `gripm_sync_backlog`: Automatically reconcile tasks and regenerate `BACKLOG.md`.

## 3. Pre-Commit Safeguards & Developer Sovereignty
- **Prohibited `git commit` by Deduction**: The agent only stages workspace changes and validates tests and typing (`tsc`). Execute `git commit` **solely upon explicit textual instruction from the user**.
- **Zero Inferred Releases**: Belonging to a sprint does not imply having a release assigned. Release fields remain unassigned until explicitly set by the user.
