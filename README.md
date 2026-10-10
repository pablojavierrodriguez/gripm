<p align="center">
  <img src="docs/brand/gripm-logo-lockup.png" alt="gripm logo in its dark frame" width="140" />
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
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933.svg?logo=nodedotjs&logoColor=white" alt="Node.js: >=20.0.0 (LTS)" /></a>
  <a href="https://gripm.vercel.app"><img src="https://img.shields.io/badge/Live%20Sandbox-Vercel%20Demo-000000.svg?logo=vercel&logoColor=white" alt="Live Sandbox on Vercel" /></a>
  <a href="#screenshots"><img src="https://img.shields.io/badge/Product-Demo%20Screenshots-6366f1.svg" alt="View product demo screenshots" /></a>
</p>

<p align="center">
  <a href="#screenshots"><img src="docs/screenshots/01-kanban-dark.png" alt="Gripm Board Kanban in dark mode with demo tasks" width="100%" /></a>
</p>

> **Your roadmap shouldn't live on someone else's servers.** Gripm keeps product and engineering work alongside your code: local-first, versionable with Git, and ready for AI agents.
>
> 🌐 **Try it in the browser (Zero Install):** Test the interactive web sandbox with preloaded demo data at **[gripm.vercel.app](https://gripm.vercel.app)**. Runs 100% in-memory without requiring any local CLI or daemon.

**gripm** (*"grip-em"*) is a local workspace for managing engineering and product backlogs, iterative planning, and releases. It gives AI agents (Cursor, Claude Code, Copilot, Antigravity) structured specifications and verifiable acceptance criteria without moving your roadmap to a third-party service.

Built with **React 18**, **Vite**, **TypeScript**, and **Tailwind CSS**.

> **Project history:** v1.0.0 was the last release under the DevBoard name. Releases from v1.0.1 onward use the canonical Gripm brand. Existing project data is automatically detected and migrated.

---

## ⚡ Quickstart (Under 1 minute)

No need to configure remote databases or cloud services. Everything lives locally on your machine and right next to your code.

### 1. Install Gripm Board
Requires Node.js 20.0.0 (LTS) or later:
```bash
npm install -g @gripm/board
```
*(Or run on-demand without global installation via `npx @gripm/board`)*

### 2. Initialize your project
Open a terminal in the root of your project (e.g., `my-app`) and run:
```bash
gripm --init
```

The interactive setup wizard offers three tailored adoption profiles:

- **`[1] Minimalist AI-First` (Default / Recommended):**
  Sets up Kanban core, markdown backlog (`backlog/tasks/*.md`), agent guidelines (`AGENTS.md`), and lightweight integrity scripts (`npm run backlog:check`, `npm run backlog:sync`). Ideal for fast-moving developers pairing with AI agents without overhead.
- **`[2] Batteries-Included:`**
  Equips the full agile suite: Kanban + Sprints (Scrum) + Releases, pre-commit Git quality hooks (`.githooks/pre-commit`), Playbook agent skills (`.agents/skills/`), and static UX auditing (`npm run audit:ux`).
- **`[3] Custom:`**
  Interactively choose your agile methodology, active modules, git hooks, and agent rules step by step.

**Non-interactive flags (CI / Automation):**
```bash
# Minimal AI-First profile (equivalent to -y)
gripm --init --minimal

# Batteries-Included full agile profile
gripm --init --full
```

### 3. Open your board
```bash
gripm
```
The CLI will automatically launch the visual board in your default browser (`http://localhost:4100`).

---

## 🤖 Connect your AI Agent (Cursor, Claude, Antigravity)

Gripm provides a native **MCP (Model Context Protocol)** server that gives your agents eyes and hands over your backlog in real time, without needing to open the browser.

### Step 1: Configure the MCP Server in your AI client
Add this snippet to your AI client's MCP configuration (e.g., `claude_desktop_config.json` or Cursor's MCP Settings):

```json
{
  "mcpServers": {
    "gripm": {
      "command": "gripm-mcp",
      "args": ["--repo", "/absolute/path/to/my-project"]
    }
  }
}
```
*If you haven't installed Gripm globally, run it via `npx`:*
```json
{
  "mcpServers": {
    "gripm": {
      "command": "npx",
      "args": ["-y", "-p", "@gripm/board", "gripm-mcp", "--repo", "/absolute/path/to/my-project"]
    }
  }
}
```
*(If `--repo` is omitted, the server defaults to the current working directory provided by the client).*

### Step 2: Equip your agents with specialized roles (Optional)
When initializing Gripm, your agent already learns how to manage the board. If you also want to equip it with a full engineering team of specialized roles (Product Manager, Principal Engineer, QA Auditor, UX Designer), run:

```bash
gripm playbook sync
```
> **What does this command do?** Downloads and synchronizes the canonical **team skills and agile methodologies** into your project's `.agents/` folder, allowing your agents to follow high-standard agile workflows.

---

## 🖼️ Screenshots

Explore the local-first board, iterative planning, and release changelogs using a clean demo project:

| Kanban — Dark Mode | Kanban — Light Mode |
| :---: | :---: |
| <img src="docs/screenshots/01-kanban-dark.png" alt="Gripm Board Kanban in dark mode" width="100%" /> | <img src="docs/screenshots/02-kanban-light.png" alt="Gripm Board Kanban in light mode" width="100%" /> |
| Iterative Planning & Backlog | Release Changelog |
| <img src="docs/screenshots/03-backlog-sprints.png" alt="Sprint and Backlog planning view" width="100%" /> | <img src="docs/screenshots/04-release-changelog.png" alt="Release notes generator" width="100%" /> |

---

## 💡 Why gripm?

### The Problem
When managing codebases, tracking often starts with static Markdown files (`BACKLOG.md`, `TODO.md`). As work grows, prioritizing tasks, filtering interactively, and compiling release notes becomes tedious.

Hosted cloud tools centralize data on third-party servers and rely on proprietary web APIs. For developers and AI agents, a local backlog versioned alongside code is substantially faster, private, and auditable.

### Advantages over Hosted Cloud Tools

| Factor | Hosted Cloud Services | gripm ⚡ |
| :--- | :--- | :--- |
| **Data** | Stored on third-party cloud infrastructure. | **Local-first**. The backlog lives in local files under your control; Gripm never uploads it to the cloud. |
| **Git** | Bound to external web hooks and integrations. | Version tasks alongside code; review roadmap changes in Pull Requests. |
| **Access** | Requires an internet connection and remote login. | Runs locally on your machine; operates 100% offline. |
| **Workflow** | Rigid workflows or heavy enterprise configurations. | Tailored for development: Ideas → Plan → Build → Ship, with Kanban or Sprints. |
| **AI Agents** | Limited by web plugins and remote rate limits. | Native `stdio` MCP server: agents read and mutate tasks in milliseconds. |

---

## 🗄️ Flexible Dual Storage Engine

gripm lets you choose how to store each project on disk without requiring an external database:

### 1. Distributed Markdown (`backlog-md`)
- **Format**: `backlog/tasks/<CODE> - <Title>.md` with clean YAML frontmatter and structured sections (`<!-- AC:BEGIN -->`, `<!-- SECTION:PLAN:BEGIN -->`).
- **Why use it**: Best for teams and AI agents. Each task is an independent file, minimizing merge conflicts in Git.

### 2. Single JSON File (`json`)
- **Format**: `.gripm/backlog.json`
- **Why use it**: Ideal if you prefer an ultra-compact single-file footprint without populating your repo with individual task files.

### 🔄 Bidirectional Conversion
You can switch storage engines at any time directly from the project settings:
- **"Split into individual .md files"**: Converts `.gripm/backlog.json` into `backlog/tasks/*.md`.
- **"Unify into a single JSON file"**: Consolidates all `backlog/tasks/*.md` into `.gripm/backlog.json`.

### 💾 Export & Backups
- **Document Report (`BACKLOG.md`)**: Exports a consolidated Markdown overview of the board or active sprint for PRs or documentation.
- **Full Backup (`backlog.json`)**: Exports all project data (tasks, acceptance criteria, technical plans, and releases) for offline archiving or migration.

---

## 🧭 Architecture of the Gripm Tools Ecosystem

For advanced developers, CI pipelines, and engineering teams, the Gripm ecosystem consists of decoupled components designed to complement each other:

```
                  ┌────────────────────────────────────────┐
                  │              gripm                     │
                  │         (Tools Ecosystem)              │
                  └──────────────────┬─────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────────────┐
│        Gripm Board                   │   │         Gripm Playbook               │
│     (@gripm/board)                   │   │       (@gripm/playbook)              │
│                                      │   │                                      │
│ • Local Web Cockpit (React 18/Vite)  │   │ • 12 AI Agent Role Skills catalog    │
│ • CLI (`gripm`)                      │   │ • Agile methodology guides (.agents/)│
│ • MCP Server (`gripm-mcp`)           │   │ • Executable UX audit engine         │
│ • Markdown / JSON Storage Engine     │   │   (`scripts/audit-ux-code.cjs`)      │
└──────────────────┬───────────────────┘   └──────────────────┬───────────────────┘
                   │                                          │
                   │  gripm playbook sync                     │
                   └──────────────────────────────────────────┘
                    (Copies canonical .md skill files to repo)
```

### 1. Component Responsibilities

| Component | npm Package | What it solves | Does it require the other? |
| :--- | :--- | :--- | :--- |
| **Gripm Board** | `@gripm/board` | The visual board UI, local CLI, and backlog storage engine. | **No.** Fully autonomous and standalone. |
| **Gripm MCP** | *(Included in Board)* | The `stdio` MCP server allowing AI agents to query and update the Board backlog. | Distributed with Board (`gripm-mcp` or `gripm mcp`). |
| **Gripm Playbook** | `@gripm/playbook` | Agile development framework for agents, specialized skills, and static UX auditing. | **No.** Can be used with Jira, Linear, or no board at all. |

### 2. Key Distinction: `gripm playbook sync` vs. `npm install @gripm/playbook`

- **`gripm playbook sync` (Lightweight & standard workflow):**
  - Does not add dependencies to `node_modules` or modify `package.json`.
  - Downloads canonical Markdown files (`.agents/skills/*.md`, `TEAM_PLAYBOOK.md`) directly into your repository for your agents to read.
  - Recommended for all projects managing tasks with Gripm Board.

- **`npm install -D @gripm/playbook` (CI engine & non-Board projects):**
  - Installs Playbook as a formal devDependency in `package.json`.
  - Provides direct access to the executable UX auditing script (`playbook audit` or `scripts/audit-ux-code.cjs`) for CI pipelines (`npm test`).
  - Ensures strict SemVer versioning and deterministic reproducibility via `package-lock.json`.

> **Note on Gripm Suite:** "Suite" refers to the future vision of a unified installer. It does not exist as a package today; Board and Playbook are modular, independent tools.

---

## 🤖 Built-in MCP Server (12 Tools)

The `@gripm/board` package includes a native `stdio` MCP server (`bin/gripm-mcp.js`), launched automatically when your AI client connects:

| Tool | Purpose | Key Parameters |
| :--- | :--- | :--- |
| `gripm_list_projects` | Lists registered projects and their storage engine (`backlog-md` or `json`). | None |
| `gripm_get_stats` | Queries consolidated metrics (% completion, open vs closed, grouped by prefix). | `projectId` |
| `gripm_list_tasks` | Queries tasks with token-efficient filters (1-line `compact` format, `openOnly`, `prefix`). | `projectId`, `status`, `openOnly`, `prefix`, `taskIds`, `format`, `limit` |
| `gripm_get_task` | Returns full details of a task, its acceptance criteria, and implementation plan. | `taskId` (e.g., `"DEV-001"`) |
| `gripm_create_task` | Creates a new task in the project's native format (`backlog/tasks/*.md` or JSON). | `title`, `description`, `type`, `priority`, `acceptanceCriteria` |
| `gripm_update_task` | Updates status (`draft`, `doing`, `review`, `ready`, `done`), toggles criteria, or sets technical plans. | `taskId`, `status`, `toggleAcIndex`, `implementationPlan` |
| `gripm_bulk_update_tasks` | Bulk updates multiple tasks in a single atomic call (by prefix or list of IDs). | `projectId`, `taskIds`, `filterPrefix`, `updates` |
| `gripm_list_releases` | Queries published releases, changelog notes, and associated tasks. | `projectId`, `version` |
| `gripm_export_backlog` | Generates or updates the consolidated `BACKLOG.md` report. | `projectId` |
| `gripm_sync_backlog` | Reconciles completed tasks with acceptance criteria and synchronizes `BACKLOG.md`. | `projectId`, `autoFix` |
| `gripm_create_retro` | Generates a structured sprint retrospective upon iteration completion. | `projectId`, `sprintId`, `sprintName`, `whatWentWell`, `whatWentWrong`, `whatToImprove` |
| `gripm_list_retros` | Lists historical retrospectives stored in `backlog/retros/`. | `projectId` |

### 🛡️ MCP Quality Gatekeeper (Zero-Hallucination Delivery)

The Gripm MCP server (`bin/gripm-mcp.js`) acts as an automated quality gatekeeper for autonomous agents:
- **Acceptance Criteria Verification:** Rejects state transitions to `ready` or `done` if any acceptance criteria remain unchecked (`- [ ]`). It immediately reports the exact missing criteria so the agent can implement or test them.
- **Verification Command Gate (`verifyCommand`):** Executes configured verification commands (e.g., `npm test`, `npx tsc --noEmit`) before allowing tasks to advance to certified states.
- **Deterministic Agent Feedback:** Emits structured error messages that prevent agents from cutting corners or hallucinating task completion.

---

## 🔒 Privacy & Git Strategies: Public vs. Private Repos

gripm is local-first: backlog data stays on your machine under your control. Choose a Git strategy based on your repository's visibility:

### ⚠️ Critical Git Principle for Public Repositories
In public Git repositories (e.g., GitHub, GitLab), **every pushed branch and commit is public to the world**, not just `main`. Pushing confidential roadmaps to a `dev` or `feature` branch will expose them publicly!

### Recommended Strategies

#### Strategy 1: "Backlog as Code" (For private repos or open-source projects with public roadmaps)
- **Files**: Commit `backlog/tasks/*.md` (or `.gripm/backlog.json`) directly to Git.
- **Benefits**: Tasks, criteria, and plans travel in the same Pull Requests as the implementation. Full Git audit trail.
- **When to use**: Private internal repositories or open-source projects with an intentional public roadmap.

#### Strategy 2: Local Backlog via `.gitignore` (For public repos with an internal roadmap)
- **Configuration**: Add Gripm directories to `.gitignore`:
  ```gitignore
  # Ignore local gripm backlog in public repositories
  .gripm/
  backlog/
  ```
- **Benefits**: Use the visual board and MCP locally without pushing task files to GitHub.
- **When to use**: Client work or public repositories where task tracking must remain strictly private.

#### Strategy 3: Dedicated Private Backlog Repository
- Keep the public repo clean of tasks and maintain an independent private repo (e.g., `my-project-backlog`).
- Point Gripm or MCP to that directory:
  ```bash
  gripm-mcp --repo /path/to/my-project-backlog
  ```

---

## 🧹 Detaching or Uninstalling gripm from a Repo

To remove gripm configuration from a project without deleting your tasks, run `gripm --uninstall`:

```bash
gripm --uninstall
```

| Flag | Effect |
|---|---|
| `--uninstall`, `--clean` | Detaches gripm from this repository |
| `--global` | Also purges the global device registry (`~/.gripm/`) |
| `--remove-agents` | Also deletes `.agents/skills/` and `AGENTS.md` (preserved by default) |
| `--yes`, `-y` | Non-interactive execution without confirmation prompts |

### Three Data Preservation Guarantees:
1. 🔒 `backlog/` and `BACKLOG.md` **are never deleted** under any mode or flag. Your requirements are always safe.
2. 🔒 Any custom `board` script in your `package.json` is preserved intact.
3. 🔒 Global purge explicitly shows how many registered projects will be detached and requests confirmation.

---

## 📜 Backlog History & Git

Gripm provides project history and a trash bin with permanent purge actions. For a formal audit trail, track the relevant files in Git and commit them regularly; local storage alone is not a backup.

Releases can also be summarized in `CHANGELOG.md`.

---

## 🛠️ Integrity & Verification Commands

gripm includes automated verification scripts to audit consistency across code, tasks, and documentation:

```bash
# Audits consistency between code, checked criteria, and task statuses
npm run backlog:check

# Auto-reconciles completed tasks and updates consolidated BACKLOG.md
npm run backlog:sync

# Static UX and performance audit (zero CLS, layout shifts, tap targets)
npm run audit:ux

# Checks strict TypeScript typing, builds Vite bundle, and packages binaries
npm run build
```

---

## 🧩 Modular Cockpit & Settings

Gripm is built with a modular, decoupled architecture. You can enable or disable specific agile workflows to suit your team's rhythm:

- **Kanban Core (Always Active):** Continuous agile flow, customizable columns, WIP limits, and instant filtering.
- **Sprints (Scrum Iterations):** Optional timeboxed planning container for teams running fixed cadence iterations.
- **Releases:** Autonomous release assembler that packages completed (`ready`) value into semantic releases and generates `CHANGELOG.md` independently of sprints.
- **Multi-Project Hub:** Switch between multiple registered codebases from a single cockpit (`gripm --hub`).

Toggle modules on the fly in the visual UI under **Settings > Módulos & Add-ons**, or customize repository defaults directly in `.gripm/config.json`:
```json
{
  "methodology": "kanban",
  "enabledTabs": {
    "kanban": true,
    "sprint": false,
    "release": true
  }
}
```

---

## 💻 VS Code & Cursor Webview Integration

Eliminate context switching between your browser and code editor. Gripm embeds directly inside VS Code and Cursor as a native sidebar panel:

1. **Embedded Webview:** Loads the full responsive Gripm cockpit in an editor side panel.
2. **Local Workspace Sync:** Directly reads and writes `backlog/tasks/*.md` in the currently open editor workspace without remote API latency.
3. **Seamless AI Flow:** Monitor tasks, inspect acceptance criteria, and watch autonomous agents move items across columns while remaining focused in your code.

---

## 🌿 Concurrent Multi-Agent Workflows with Git Worktrees

When coordinating multiple autonomous agents or parallel human developers, working in a single directory can cause dirty tree collisions and Git locks. Gripm's distributed architecture natively supports Git Worktrees:

### 1. Create an isolated worktree for an agent or task
```bash
# Branch and isolate DEV-221 in a separate directory
git worktree add ../my-app-DEV-221 -b feature/DEV-221
```

### 2. Run MCP or tests independently
```bash
# The agent operates inside its isolated worktree
cd ../my-app-DEV-221
gripm-mcp --repo .
```

### 3. Reintegrate and clean up
Because Gripm stores tasks as separate Markdown files (`backlog/tasks/DEV-XXX - slug.md`), independent tasks merge cleanly without monolithic backlog conflicts:
```bash
cd ../my-app
git merge feature/DEV-221
git worktree remove ../my-app-DEV-221
```

---

## 🛠️ Core Developers & Contributors Guide

*For developers wishing to extend gripm, customize visual components, or contribute to the core.*

### 1. Clone & Setup Development Environment
```bash
git clone https://github.com/pablojavierrodriguez/gripm.git
cd gripm
npm install
npm run dev
```
The development server opens `http://localhost:4100` with Vite Hot Module Reloading.

### 2. Local Development Link (`npm link`)
To test your modified local version globally on other repositories:
```bash
npm link
```
*Now `gripm` and `gripm-mcp` commands will execute your local fork directly.*

### 3. Advanced CLI Modes & Flags
- `--hub`: Forces multi-project hub mode (manages all registered projects in `~/.gripm/registry.json`).
- `--port <number>`: Specifies a custom port (e.g., `gripm --port 4200`).
- `--repo <path>`: Points to an explicit project directory instead of the current folder.
- `--no-open`: Launches the web server without automatically opening the browser.

**Disabling the GitHub update check:**
```bash
GRIPM_NO_UPDATE_CHECK=1 gripm
```
*(In PowerShell: `$env:GRIPM_NO_UPDATE_CHECK = "1"; gripm`)*

---

## ✨ Features

- **Product Backlog:** Create and organize tasks with acceptance criteria, labels, priorities, and relations.
- **Dual Storage Formats:** Store tasks as distributed Markdown files or a single JSON backlog; easily convert between them.
- **Flexible Workflows:** Operate with continuous Kanban or plan iterations; configure columns, custom types, and WIP limits.
- **Releases:** Package completed work by delivered value and generate changelogs independently of iterations.
- **AI Agent Integration:** Connect the built-in MCP server to query and mutate the backlog in real time.
- **Local Scaffolding:** Initialize Board with `gripm --init` and optionally configure agent rules, scripts, and Git hooks.
- **Cross-Platform CLI:** Launch the board, inspect projects, or run MCP headlessly.

---

## 🐶 Dogfooding ("Git Building Git")

gripm uses Gripm Board to manage its own development. The project backlog and configuration are available in [`backlog/tasks/`](backlog/tasks/) and `.gripm/`.

---

## ⌨️ Keyboard Shortcuts

- `N`: Create new backlog task
- `⌘K` / `Ctrl+K`: Focus instant search bar
- `1` - `5`: Switch tabs (`1`: Board, `2`: Sprints & Backlog, `3`: Releases, `4`: Trash, `5`: Settings)
- `Esc`: Close open modal
- `⌘+Enter`: Save task / form

---

## 🤝 Ecosystem & Interoperability

gripm promotes open, sovereign development workflows without proprietary lock-in. Its distributed Markdown storage engine adopts the independent file convention (`backlog/tasks/*.md`) popularized by community standards such as [MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md).

This design allows engineering teams to freely combine terminal CLIs with Gripm's visual board and AI agents within the same repository.

---

## 🤝 Contributing

Contributions are welcome. gripm dogfoods itself: **every code change is tracked in `backlog/tasks/`**.

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — setup, verification pyramid (`tsc`, `npm test`, `backlog:check`), and branch conventions.
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** — Contributor Covenant v2.1.
- **[SECURITY.md](SECURITY.md)** — responsible vulnerability reporting.
- **[CHANGELOG.md](CHANGELOG.md)** — version changelog generated from `backlog/releases.json`.
- **[AGENTS.md](AGENTS.md)** — operational guide for developers and AI agents.

---

## 📄 License

MIT © 2026 gripm Contributors
