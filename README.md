<p align="center">
  <img src="docs/brand/gripm-logo.png" alt="gripm Logo" width="140" style="border-radius: 28px;" />
</p>

<h1 align="center">gripm ⚡</h1>

<p align="center">
  <strong>Traction for AI-velocity engineering: A sovereign, local-first Agile & Product Management Cockpit for developers and AI pair programmers.</strong>
</p>

<p align="center">
  🌐 <strong><a href="README.md">English</a></strong> | <strong><a href="README.es.md">Español</a></strong>
</p>

<p align="center">
  <a href="https://github.com/pablojavierrodriguez/gripm-playbook"><img src="https://img.shields.io/badge/Methodology-gripm%20Playbook-purple.svg" alt="Methodology: gripm Playbook" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-Protocol%20Ready-6366f1.svg" alt="MCP Protocol: 2024-11-05" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D22.6.0-339933.svg?logo=nodedotjs&logoColor=white" alt="Node.js: >=22.6.0" /></a>
</p>

**gripm** (*"grip-em"*) is a self-contained agile engineering and product management cockpit designed to eliminate the friction of managing issues, technical debt, sprint backlogs, and releases directly alongside your code. It provides the firm **grip** and traction needed to guide AI agents (Cursor, Claude Code, Copilot, Antigravity) with structured specifications, acceptance criteria, and sovereign local-first release packaging.

Built with **React 18**, **Vite**, **TypeScript**, and **Tailwind CSS**. Designed to operationalize the [**gripm Playbook**](https://github.com/pablojavierrodriguez/gripm-playbook) methodology.

---

## 💡 Why gripm?

### The Problem
When managing codebases, task tracking often begins as static Markdown files (`BACKLOG.md`, `TODO.md`). Over time, these become unstructured, write-only graveyards: difficult to prioritize across sprints, impossible to filter interactively, and painful to reconcile when assembling release changelogs.

Cloud project management tools (Jira, Trello, Asana) swing to the other extreme: sluggish loading times, heavy enterprise bloat, disconnected from code commits, and requiring private architecture, technical debt, and internal security flaws to live on third-party servers.

### Why gripm over Cloud PM Tools?

| Factor | Cloud PM Tools (Jira, Trello, Asana) | gripm ⚡ |
| :--- | :--- | :--- |
| **Data Privacy** | Cloud hosted. Roadmaps and vulnerabilities live on remote servers. | **100% Sovereign & Local-First**. Zero telemetry, zero leaks. Stored in your local repo. |
| **Git Alignment** | Disconnected from code; requires manual syncing or brittle webhooks. | **Versioned with your code**. Commit task states alongside pull requests and branches. |
| **Speed & Weight** | Heavy bundles, multi-second loading, constant spinner states. | **Sub-200ms instant startup**. Zero bloat, runs locally on a single port. |
| **Workflow Focus** | Cluttered with corporate forms, permissions, and notification noise. | **Laser-focused on developer flows**: Ideas → Sprint → Plan → Release. |
| **AI Pair Programming** | Generic text fields with no structured context bridge for coding agents. | **Native AI Bridge**: Built-in Plan Guard, stdio MCP Server & ready-to-run agent prompts. |

---

## 🗄️ Flexible Dual Storage Engine

gripm gives you explicit control over how each project is stored on disk, with **zero external dependencies**:

### 1. Distributed Markdown (`backlog-md` mode)
- **Format**: `backlog/tasks/<CODE> - <Title>.md` with clean YAML frontmatter and delimited sections (`<!-- AC:BEGIN -->`, `<!-- SECTION:PLAN:BEGIN -->`).
- **Why use it**: Ideal for teams or multi-agent workflows. Because each task is an independent file, concurrent Git branches and AI coding agents can create, update, and resolve tasks with **zero merge conflicts**.

### 2. Single-File JSON (`json` mode)
- **Format**: `.gripm/backlog.json`
- **Why use it**: Ideal when you prefer a compact, single-file footprint without creating individual task files in your repository.

### 🔄 1-Click Bidirectional Conversion
From the project settings in gripm, you can convert between storage engines anytime with zero data loss:
- **"Split into individual .md files"**: Takes `.gripm/backlog.json` and splits it into `backlog/tasks/*.md`.
- **"Unify into single JSON file"**: Takes `backlog/tasks/*.md` and compacts everything into `.gripm/backlog.json`.

### 💾 Export & Downloads
- **Documentation Report (`BACKLOG.md`)**: Exports a single, beautifully formatted Markdown summary of your active board or sprint for PRs, issues, or documentation.
- **Full Backup (`backlog.json`)**: Exports complete project data (tasks, acceptance criteria, technical plans, releases) for offline archive or migration.

---

## 📐 Methodology: Agentic Team Playbook

gripm is engineered from the ground up to operationalize the [**Agentic Team Playbook**](docs/AGENTIC_PLAYBOOK.md), a rigorous engineering framework for teams pairing with AI agents (Antigravity, Cursor, Claude Code, GitHub Copilot).

It replaces chaotic "vibe coding" with strict, transparent engineering guardrails:
- **Phase 1: Context & Grounding** — No agent touches code without anchoring to an atomic task in `backlog/tasks/`.
- **Phase 2: Plan Guard** — Explicit architecture and step-by-step implementation plans before execution.
- **Phase 3: Atomic Incremental Execution** — Live checkbox tracking (`- [x]`) and strict scope isolation.
- **Phase 4: Automated Verification Gates** — Pre-commit hooks (`.githooks/pre-commit`) prevent desynchronization between code and backlog.
- **Phase 5: Release Hub & Traceability** — Historical versioning, automated changelog compilation, and zero merge conflicts.

👉 Read the full methodology in [**docs/AGENTIC_PLAYBOOK.md**](docs/AGENTIC_PLAYBOOK.md).

> **Pro Tip:** Keep your project's agent skills and rules synchronized with the latest upstream standard using `npx gripm playbook sync` (or `npm run playbook:sync`).

---

## 🎯 Choose Your Path: Who is gripm For?

gripm caters to two distinct audiences. Choose the path that matches what you want to do:

| 👤 Profile 1: Product User / App Developer | 🛠️ Profile 2: Open Source Contributor & Customizer |
| :--- | :--- |
| **"I want to track tasks & use AI in my existing project"** | **"I want full control of the code to customize or fork it"** |
| ✅ Zero need to clone the gripm repository | ✅ Clone or fork the gripm repository |
| ✅ 1-minute setup via interactive CLI (`gripm --init`) | ✅ Modify React, Tailwind, and TypeScript source files |
| ✅ Local web board + AI pairing in Cursor / Claude | ✅ Run Vite dev server with hot reload (`npm run dev`) |
| ⏩ **[Go to User Quick Start](#-user-quick-start-profile-1)** | ⏩ **[Go to Developer & Customizer Guide](#-developer--customizer-guide-profile-2)** |

---

## 🚀 User Quick Start (Profile 1)
*Use gripm in any repository without touching or cloning the gripm codebase.*

### Step 1: Install gripm Globally (Run once on your machine)
Install the CLI from npm:
```bash
npm install -g @gripm/board
# or directly from GitHub: npm install -g github:pablojavierrodriguez/gripm
```
*(Or run on-demand with zero install: `npx @gripm/board`)*

### Step 2: Initialize Your Project (1-minute setup)
Open a terminal in your project's root directory (e.g. `my-app`) and run:
```bash
gripm --init
```
The friendly interactive wizard guides you through 5 key decisions:
1. **Operating Mode**: Choose **Single-Project Mode** (isolated, self-contained within your repo) or **Multi-Project Hub** (managed centrally in `~/.gripm/registry.json`).
2. **AI Agent Skill**: Installs `.agents/skills/gripm/SKILL.md` so Cursor, Antigravity, and Claude Code know how to manage tasks.
3. **Governance Rules**: Generates `AGENTS.md` with best practices and pre-commit guardrails.
4. **Quick Scripts**: Adds `"board"` and `"mcp"` with auto-fallback to your `package.json`.
5. **Git Ignore**: Adds recommended exclusions (`.gripm/update-cache.json`, etc.) to `.gitignore`.

*Non-interactive flag for CI or automatic setup:*
```bash
gripm --init -y
```

### Detaching gripm from a repository

To remove gripm from a project, the `uninstall` command lets you pick the
scope, and **never deletes your backlog**:

```bash
gripm --uninstall
```

| Flag | Effect |
|---|---|
| `--uninstall`, `--clean` | Detaches gripm from this repository |
| `--global` | Also purges the device-wide registry (`~/.gripm/`) |
| `--remove-agents` | Also removes `.agents/skills/` and `AGENTS.md` (preserved by default) |
| `--yes`, `-y` | No questions: detach the current project (or global purge with `--global`) |

Interactively it offers two scopes: **detach this project only** — cleans
`.gripm/`, reverts the `board` and `mcp` scripts in `package.json`, and removes
the `.gitignore` rules gripm added— or **purge every local instance**, which
also clears the central registry.

Three design guarantees:

- 🔒 `backlog/` and `BACKLOG.md` are **never touched**, under any flag or mode.
  This isn't a code precaution: the list of removable paths is explicit and the
  backlog isn't in it.
- 🔒 Your own script named `board` is preserved. Only the scripts gripm
  injected get reverted.
- 🔒 A global purge tells you how many registered projects will be deregistered
  and asks for confirmation.

### Step 3: Daily Usage — Open Your Board
Whenever you want to work on your project, simply run:
```bash
gripm
```
*(Or `npm run board` if you enabled the script during init).*  
*gripm launches your visual Kanban board in your default browser at `http://localhost:4100` in under 200ms.*

### Step 4 (Optional): Connect Your AI Agent (Cursor / Claude / Antigravity)
Add gripm to your IDE's MCP configuration (`.cursor/mcp.json`, Claude Desktop, or Antigravity):
```json
{
  "mcpServers": {
    "gripm": {
      "command": "gripm-mcp",
      "args": ["--repo", "."]
    }
  }
}
```
*Your AI agent will automatically detect `backlog/tasks/` in your repository and manage tasks through 12 dedicated tools.*

---

## 🛠️ Developer & Customizer Guide (Profile 2)
*For developers who want full control over the gripm codebase: extend features, customize UI components, or fork the project.*

### 1. Clone & Run the Development Environment
Clone the repository and launch Vite with Hot Module Replacement (HMR):
```bash
git clone https://github.com/pablojavierrodriguez/gripm.git
cd gripm
npm install
npm run dev
```
*Open `http://localhost:4100`. Pre-commit verification hooks configure automatically via `npm install`.*

### 2. Local Developer Link (`npm link`)
To use your customized local fork globally across other projects on your machine:
```bash
npm link
```
*Now `gripm` and `gripm-mcp` commands run your local build directly.*

### 3. Advanced CLI Flags
- `--single` / `--mono`: Force isolated single-project mode (ignores other repositories and locks active context).
- `--hub`: Force multi-project hub mode (loads and manages all registered projects in `~/.gripm/registry.json`).
- `--port <number>`: Specify a custom port (e.g. `gripm --port 4200`).
- `--repo <path>`: Target an explicit repository path instead of the current working directory.

**Silencing Update Checks:**
Like Supabase CLI, gripm checks GitHub Releases once every 24 hours. To disable:
```bash
GRIPM_NO_UPDATE_CHECK=1 gripm
```

---

## 🤖 Standalone MCP Server Tools (12 Tools)

Configure gripm in your agent environment (e.g. Cursor, Claude Desktop, Antigravity):
```json
{
  "mcpServers": {
    "gripm": {
      "command": "gripm-mcp"
    }
  }
}
```

Or pointing to an explicit repository path:
```json
{
  "mcpServers": {
    "gripm": {
      "command": "gripm-mcp",
      "args": ["--repo", "/path/to/my-repo"]
    }
  }
}
```

Or run via npm inside this workspace:
```bash
npm run mcp
```

### Available MCP Tools (12 Tools)

| Tool | Purpose | Key Parameters |
| :--- | :--- | :--- |
| `gripm_list_projects` | Lists registered projects and their storage engines (`backlog-md` or `json`). | None |
| `gripm_get_stats` | Consolidated backlog metrics (% done, open vs closed, grouped by task prefix). | `projectId` |
| `gripm_list_tasks` | Fast querying with token-efficient filters (`compact` 1-line format, `openOnly`, `prefix`). | `projectId`, `status`, `openOnly`, `prefix`, `taskIds`, `format`, `limit` |
| `gripm_bulk_update_tasks` | Mass batch update across dozens of tasks in 1 call (by prefix or ID list). | `projectId`, `taskIds`, `filterPrefix`, `updates` |
| `gripm_list_releases` | Inspects published releases, changelog notes, and associated tasks. | `projectId`, `version` |
| `gripm_get_task` | Fetches full task specifications, acceptance criteria, and technical plans. | `taskId` (e.g. `"DEV-001"`, `"TASK-010"`) |
| `gripm_create_task` | Adds a new task directly into the repository in the project's native storage format. | `title`, `description`, `type`, `priority`, `acceptanceCriteria` |
| `gripm_update_task` | Updates status (`draft`, `doing`, `review`, `ready`, `done`), toggles criteria checkboxes, or technical plans. | `taskId`, `status`, `toggleAcIndex`, `implementationPlan` |
| `gripm_export_backlog` | Generates or refreshes the consolidated `BACKLOG.md` report. | `projectId` |
| `gripm_sync_backlog` | Audits and auto-reconciles tasks with completed criteria and updates `BACKLOG.md`. | `projectId`, `autoFix` |
| `gripm_create_retro` | Generates a structured retrospective file for a completed sprint. | `projectId`, `sprintId`, `sprintName`, `whatWentWell`, `whatWentWrong`, `whatToImprove` |
| `gripm_list_retros` | Lists historical retrospectives recorded in `backlog/retros/`. | `projectId` |

---

## 🔒 Privacy & Git Strategies: Public vs. Private Repositories

gripm is **100% sovereign and local-first**: your data is never sent to external servers or telemetry systems. Because backlogs are stored directly on your local disk as files, you should choose the right Git strategy based on your repository visibility:

### ⚠️ Crucial Git Principle: Public Repositories
In public Git repositories (e.g., GitHub, GitLab), **ALL branches and commits pushed to the remote (`git push`) are visible to the world**, not just `main`. Committing confidential roadmaps to a `dev` or `feature` branch will still expose them publicly!

### Recommended Strategies

#### Strategy 1: "Backlog as Code" (Recommended for Private Repos or Public Open-Source)
- **Files**: Commit `backlog/tasks/*.md` (or `.gripm/backlog.json`) directly into Git.
- **Benefits**: Tasks, acceptance criteria, and plan updates travel in the same Pull Requests as the implementation code. Complete audit trail in Git history.
- **Use when**: The repository is private within your organization, OR the project is an open-source project with an intentionally public roadmap.

#### Strategy 2: Sovereign Local-Only Backlog via `.gitignore` (Recommended for Public Repos with Internal Roadmaps)
- **Configuration**: Add the backlog directory to your `.gitignore`:
  ```gitignore
  # Ignore internal gripm backlog in public repositories
  .gripm/
  backlog/
  ```
- **Benefits**: You and your local AI coding agents enjoy full gripm Kanban, Sprint Hub, and MCP tool capabilities locally, but no task details, internal business ideas, technical debt, or unreleased vulnerability disclosures are ever pushed to GitHub.
- **Use when**: You work on public or client-facing repositories where task tracking must remain strictly confidential.

#### Strategy 3: Dedicated Private Backlog Repository
- Keep the public repository completely clean of backlog files, and maintain a private repository (e.g., `my-project-backlog`) for tracking.
- Run gripm or point MCP to that directory:
  ```bash
  gripm-mcp --repo /path/to/private-backlog
  ```

---

## 📜 Historical Backlog Policy & Zero-Loss Traceability

In gripm, **no task, fix, or evolutionary decision should ever disappear without a Git audit trail**. The lifecycle follows strict non-destructive principles:

1. **Immutability of Resolved Tasks (`done` / `released`)**:
   - Completed tasks **are never deleted**. They remain permanently in `backlog/tasks/*.md` (or `.gripm/backlog.json`) as living documentation for future developers and AI agents.
   - When a milestone is closed, tasks are aggregated into versioned release notes (`CHANGELOG.md`), linking code commits directly to task IDs (`DEV-001`, `DEV-014`).

2. **Soft-Delete Archiving (`backlog/archive/`)**:
   - When a task is discarded, cancelled, or superseded, gripm **never performs a destructive disk deletion**.
   - Instead, the task is safely moved to `backlog/archive/<ID> - <Title>.md` with `status: dismissed`. When committed to Git, the historical rationale of why an approach was rejected is preserved forever without cluttering the active board.

3. **Strict Test Fixture Isolation**:
   - Automated test suites and regression scripts operate on isolated temporary fixture directories (`data/test-repo-*`), ensuring synthetic test items never contaminate or pollute the production backlog.

---

## 🛠️ Verification & Backlog Integrity Commands

gripm includes built-in safeguards to guarantee zero desynchronization between source code, acceptance criteria, and documentation:

```bash
# Verify integrity between code, criteria checkboxes, and task states
npm run backlog:check

# Auto-reconcile completed tasks and update the consolidated BACKLOG.md
npm run backlog:sync

# Static UX & Performance audit (zero CLS, layout shifts, touch targets)
npm run audit:ux

# Refresh the baseline after an intentional UX change, so CI only flags new
# regressions instead of the known cosmetic observations
npm run audit:ux -- --update-baseline

# Production TypeScript, Vite bundle and standalone binaries packaging
npm run build
```

---

## ✨ Features Overview (v1.0.2)

- **🌐 Comprehensive Bilingual Internationalization (i18n)**: Language selector in CLI onboarding (`--init`), full dictionary coverage across all Cockpit UI views and modals, and bilingual templates (`DEV-114`).
- **🚀 Automatic Browser Launch**: `npm run dev` and `npm run board` automatically launch the cockpit in the default system browser with `--no-open` flag support (`DEV-145`).
- **☀️ Total Light Mode Parity**: Seamless, zero-jank theme switching and complete visual parity across light and dark modes (`DEV-124`).
- **🧹 Safe Uninstall & Eject CLI**: `gripm --uninstall` with guaranteed preservation of backlog files and custom user scripts (`DEV-115`).
- **🔌 Multi-Stack Port Detection & Isolation**: Collision-free dynamic port discovery across multi-project setups (`DEV-116`).
- **🔒 Non-Mutating Pre-Commit Hook**: Rigorous backlog validation that checks without mutating the Git index, preserving selective staging (`DEV-125`).
- **🪟 Portal-Mounted Overlays**: Portals rendered on `document.body` for modals and context menus, eliminating stacking context and containing block flickering (`DEV-129`, `DEV-130`).
- **🎨 ItemModal Ergonomics**: Dynamic contextual AC placeholders by item type, unified typography, and zero-flash hydration (`DEV-126`).
- **🛠️ Open-Source Tooling & CI/CD**: GitHub Actions CI, community templates, Prettier, EditorConfig, and Node engines (`DEV-121`, `DEV-122`, `DEV-123`, `DEV-140`, `DEV-141`).
- **📐 Canonical Sprint vs Release Governance**: Releases packaged strictly by delivered value and agile timeboxing decoupled from sprint closures (`DEV-146`).
- **⚡ Zero-Install & Scaffolding Resilience**: Resilient `prepare` npm lifecycle script and smart fallback scripts in scaffolded projects (`gripm 2>/dev/null || npx -y @gripm/board`), guaranteeing zero aborts on `npx` and immediate `npm run board` execution without requiring global installs (`DEV-112`, `DEV-113`).
- **📦 Global CLI Distribution & Packaging**: Native `gripm` and `gripm-mcp` executable binaries with absolute path resolution in Tailwind CSS and Vite bundler (`DEV-108`, `DEV-144`).
- **🔒 Strict Single-Project Mode & Multi-Project Hub**: Absolute repository isolation (`--single`) to prevent data leakage across distinct codebases, alongside centralized multi-project management (`--hub`) using the XDG home directory standard (`~/.gripm/registry.json`) (`DEV-104`, `DEV-105`).
- **🧙 Interactive Project Initialization (`gripm --init`)**: Interactive onboarding wizard with readline prompting and non-interactive `--yes`/`-y` flags, supporting custom scaffolding of AI agent skills, `AGENTS.md` rules, package scripts, and Git safeguards (`DEV-109`).
- **🔔 Silent CLI Update Checker**: Non-intrusive update notifier inspired by Supabase CLI with local 24-hour cache and `GRIPM_NO_UPDATE_CHECK=1` opt-out (`DEV-107`).
- **🏷️ Interactive Labels & Assignees in ItemModal**: Tag chips editor with keyboard addition/removal and visual assignee management in the item detail modal (`DEV-111`).
- **📋 Canonical Backlog.md Engine Compatibility**: Strict ID casing preservation, in-place atomic updates, canonical sprint mapping, and release `itemCodes` preservation (`DEV-103`).
- **🛡️ Automated Pre-Release Documentation Audit**: Automated consistency checker in `verify-backlog-sync.js` preventing out-of-sync release documentation and orphan tasks (`DEV-102`, `DEV-110`).
- **🎨 Linear & Raycast Aesthetic**: Sleek glassmorphism, refined dark color palette, daylight mode toggle, and zero-CLS layout stability (`overflow-y: scroll`, `scrollbar-gutter: stable`).
- **🔄 Dual Agile Methodologies (Kanban vs Scrumban)**: 
  - **Kanban**: Continuous value delivery across all items without artificial batching.
  - **Scrumban**: Targeted Sprint Board focused on active **Sprint Goals** with live progress tracking (`%` completed, items in progress, goal fulfillment indicator).
- **🎛️ Dynamic Column Modes**:
  - **Simple Mode (3 columns)**: Optimized for speed and clarity (*Draft*, *Doing*, *Done*).
  - **Expanded Mode (5 columns)**: Complete quality lifecycle (*Draft*, *Doing*, *Review*, *Ready*, *Done*).
  - **Discovery Column (Ideas)**: Dedicated toggleable pipeline for discovery items with zero layout shifts.
- **🎯 Sprints Hub & Prioritization**: Complete sprint lifecycle (planning, active progress, sprint completion and automated retrospectives), dense table views, collapsible sprint groups, and natural sorting.
- **🌳 Hierarchical Relations & Epics Graph**: Direct parent-child relationships, sub-issues, and dependency graphs.
- **🧪 Native BDD Support**: First-class Given/When/Then specification in user stories and acceptance criteria.
- **🗑️ Direct Trash & Safe Lifecycle**: First-level Trash View (`TrashView`) with soft-delete, one-click restoration or permanent purging, decoupled from dismissed backlog items.
- **🔔 Contextual & Accessible Dialogs**: Linear-grade `ConfirmModal` for destructive actions and production release promotions, replacing raw browser alerts.
- **⚙️ Dedicated Project Settings (`SettingsView`)**: Persistent project configuration saved to `.gripm/config.json` (methodology, custom item types taxonomy, column definitions, WIP limits, and theme preferences).
- **🚀 Sovereign Release Management**: Track versions in preparation (*unreleased*) vs deployed to production (*released*) with automated changelog compilation and strict orthogonality between sprints and releases.
- **🛡️ Plan Guard**: Ensures items transitioning to `doing` have documented acceptance criteria, technical plans, or specifications before code is written.
- **📂 Cross-Platform File Explorer**: Visual folder browser (`FolderPickerModal`) for macOS, Linux, and Windows with automatic repository detection.
- **🤖 Standalone MCP Bridge**: 12 dedicated MCP tools for AI agents (Antigravity, Cursor, Claude Code) with token-efficient filters, atomic batch updates, retro generators, and live backlog synchronization.

---

## 🐶 Dogfooding ("Git Building Git")

gripm uses gripm to manage its own development. 

This repository itself contains a [`backlog/tasks/`](backlog/tasks/) folder managed in `backlog-md` mode, tracking real features, UX polish, and releases across **180+ tasks** (`DEV-001` through `DEV-185`), 9 sprints and 10 formal releases (`v0.2.0` through `v1.0.2`).

---

## ⌨️ Keyboard Shortcuts

- `N`: Create new backlog item
- `⌘K` / `Ctrl+K`: Focus instant search bar
- `1` - `5`: Switch tabs (`1`: Board, `2`: Sprint & Backlog, `3`: Releases, `4`: Trash, `5`: Settings)
- `Esc`: Close modals
- `⌘+Enter`: Save item / form

---

## 🤝 Ecosystem & Interoperability

gripm champions open, sovereign developer workflows without proprietary lock-in. Its distributed Markdown storage engine adopts the decentralized task file convention (`backlog/tasks/*.md`) popularized by projects like [MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md).

This design allows engineering teams to freely combine terminal CLIs with gripm's visual cockpit and MCP agent bridges on the exact same codebase, fostering a collaborative and interoperable file-based ecosystem.

---

## 🤝 Contributing

Contributions are welcome. gripm dogfoods itself: **every code change is tied to a
task in `backlog/tasks/`**, and the repository's own contribution guide is just
another tracked task.

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — environment requirements, setup, the
  three-step verification pyramid (`tsc`, `npm test`, `backlog:check`), branching
  conventions, and how to track your contribution with the MCP tools.
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** — Contributor Covenant v2.1.
- **[SECURITY.md](SECURITY.md)** — how to report a vulnerability privately.
- **[CHANGELOG.md](CHANGELOG.md)** — release history, generated from
  `backlog/releases.json`.

Working with an AI agent? Start the MCP server and let it drive the backlog:

```bash
npx -p @gripm/board gripm-mcp
# or once installed globally: gripm mcp
```

The task lifecycle that every change follows is documented in
[AGENTS.md](AGENTS.md).

---

## 📄 License

MIT © 2026 gripm Contributors
