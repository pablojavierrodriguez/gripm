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
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D22.6.0-339933.svg?logo=nodedotjs&logoColor=white" alt="Node.js: >=22.6.0" /></a>
  <a href="#screenshots"><img src="https://img.shields.io/badge/Product-Demo%20Screenshots-6366f1.svg" alt="View product demo screenshots" /></a>
</p>

<p align="center">
  <a href="#screenshots"><img src="docs/screenshots/01-kanban-dark.png" alt="Gripm Board Kanban in dark mode with demo tasks" width="100%" /></a>
</p>

> **Your roadmap shouldn't live on someone else's servers.** Gripm keeps product and engineering work alongside your code: local-first, versionable with Git, and ready for AI agents.

**gripm** (*"grip-em"*) is a local workspace for managing engineering and product backlogs, iterative planning, and releases. It gives AI agents (Cursor, Claude Code, Copilot, Antigravity) structured specifications and verifiable acceptance criteria without moving your roadmap to a third-party service.

Built with **React 18**, **Vite**, **TypeScript**, and **Tailwind CSS**. Gripm Board can be used on its own or alongside the independent [**Gripm Playbook**](https://github.com/pablojavierrodriguez/gripm-playbook).

> **Brand history:** v1.0.0 was the last release under the DevBoard name. Releases from v1.0.1 onward use the Gripm brand. Existing project data is still detected and migrated; the brand change does not rename or delete it.

## 🧭 Products and choosing the right command

**Gripm** is the ecosystem, with two independent products:

| Product | What it does | Package / entry point |
| :--- | :--- | :--- |
| **Gripm Board** | Manages a project's backlog through a local web UI and CLI. | `@gripm/board` → `gripm` |
| **Gripm Playbook** | Provides methodology and agent skills; it can be used without Board. | Independent package: `@gripm/playbook` ([repository](https://github.com/pablojavierrodriguez/gripm-playbook)) |

**MCP is an interface to Board, not a third product or a separate package.** It lets an AI agent read and update the same backlog without opening the web UI. The MCP client starts the `stdio` process when it connects, after you configure it.

Choose a command by intent:

| Goal | Command | Effect |
| :--- | :--- | :--- |
| Install Board and its commands (once per machine) | `npm install -g @gripm/board` | Installs `gripm` and `gripm-mcp`; does not install Playbook |
| Use Board without a global install | `npx @gripm/board --repo <path>` | Opens the board for the selected project |
| Set up a project for Board | From its directory: `gripm --init` | Configures the project; does not install another product |
| Open the board | From the project: `gripm` | Opens Board in your browser |
| Connect an agent to the backlog | Configure `gripm-mcp --repo <path>` in your AI client | The client starts the MCP process over `stdio`; the repo defaults to the client's working directory if `--repo` is omitted |
| Refresh Playbook materials in a project | `gripm playbook sync --repo <path>` | Syncs files/skills; does not install or update the Playbook package |
| Use Playbook only | Follow its [repository and package instructions](https://github.com/pablojavierrodriguez/gripm-playbook) | Does not require Board |

**Gripm Suite does not have a package or installer yet.** To use both products, install/configure Board and Playbook separately. Run `gripm --help` for CLI commands; unknown subcommands are rejected instead of accidentally opening the board.

## 🖼️ Screenshots

Explore the local-first board, iterative planning, and release notes using a clean demo project:

| Kanban — Dark mode | Kanban — Light mode |
| :---: | :---: |
| <img src="docs/screenshots/01-kanban-dark.png" alt="Gripm Kanban board in dark mode" width="100%" /> | <img src="docs/screenshots/02-kanban-light.png" alt="Gripm Kanban board in light mode" width="100%" /> |
| Iterative planning and backlog | Release notes assembler |
| <img src="docs/screenshots/03-backlog-sprints.png" alt="Sprint and backlog planning with demo metrics" width="100%" /> | <img src="docs/screenshots/04-release-changelog.png" alt="Release assembler compiling changelog notes" width="100%" /> |

---

## 💡 Why gripm?

### The Problem
When managing codebases, task tracking often begins as static Markdown files (`BACKLOG.md`, `TODO.md`). As work grows, teams may need clearer prioritization, interactive filtering, and a reliable way to assemble release notes.

Hosted project-management tools centralize data with their providers and offer broad collaboration features. For teams that prefer to keep backlog data alongside their code, a local, Git-versioned workflow can be a more direct alternative.

### Where gripm fits

| Factor | Hosted project-management services | gripm ⚡ |
| :--- | :--- | :--- |
| **Data** | Stored on the provider's infrastructure. | **Local-first**. Backlog data stays in local files you control; Gripm does not upload it to a Gripm service. The CLI can check GitHub Releases for updates. |
| **Git** | Relationship to your code depends on the service's features and integrations. | Version tasks alongside code and collaborate through Git. |
| **Access** | Accessed through the provider's service, usually on the web. | Serves the board from your machine; no hosted project-management service is required. |
| **Workflow** | Offers different work and collaboration flows. | Focuses on engineering backlogs: Ideas → Plan → Build → Release, with optional iteration planning. |
| **AI agents** | Integration depends on the available features and integrations. | Includes an MCP server for agents to read and update the backlog. |

---

## 🗄️ Flexible Dual Storage Engine

gripm gives you explicit control over how each project is stored on disk. No external database or hosted storage service is required:

### 1. Distributed Markdown (`backlog-md` mode)
- **Format**: `backlog/tasks/<CODE> - <Title>.md` with clean YAML frontmatter and delimited sections (`<!-- AC:BEGIN -->`, `<!-- SECTION:PLAN:BEGIN -->`).
- **Why use it**: Useful for teams or multi-agent workflows. Independent task files reduce contention, although changes to shared files can still conflict in Git.

### 2. Single-File JSON (`json` mode)
- **Format**: `.gripm/backlog.json`
- **Why use it**: Ideal when you prefer a compact, single-file footprint without creating individual task files in your repository.

### 🔄 Bidirectional Conversion
From project settings, you can convert between storage engines. Back up your project before changing its storage format:
- **"Split into individual .md files"**: Takes `.gripm/backlog.json` and splits it into `backlog/tasks/*.md`.
- **"Unify into single JSON file"**: Takes `backlog/tasks/*.md` and compacts everything into `.gripm/backlog.json`.

### 💾 Export & Downloads
- **Documentation Report (`BACKLOG.md`)**: Exports a Markdown summary of your active board or selected iteration for PRs, issues, or documentation.
- **Full Backup (`backlog.json`)**: Exports complete project data (tasks, acceptance criteria, technical plans, releases) for offline archive or migration.

---

## 📐 Working with AI agents

Board gives coding agents structured backlog context and acceptance criteria through MCP. It can be used on its own or alongside the independent [**Gripm Playbook**](https://github.com/pablojavierrodriguez/gripm-playbook), which provides a methodology and agent skills. Playbook is optional; `gripm playbook sync` copies selected materials into a project but does not install the Playbook product.

---

## 🎯 Choose Your Path: Who is gripm For?

gripm caters to two distinct audiences. Choose the path that matches what you want to do:

| 👤 Profile 1: Product User / App Developer | 🛠️ Profile 2: Open Source Contributor & Customizer |
| :--- | :--- |
| **"I want to track tasks & use AI in my existing project"** | **"I want full control of the code to customize or fork it"** |
| ✅ Zero need to clone the gripm repository | ✅ Clone or fork the gripm repository |
| ✅ Guided setup via CLI (`gripm --init`) | ✅ Modify React, Tailwind, and TypeScript source files |
| ✅ Local web board + AI pairing in Cursor / Claude | ✅ Run Vite dev server with hot reload (`npm run dev`) |
| ⏩ **[Go to User Quick Start](#-user-quick-start-profile-1)** | ⏩ **[Go to Developer & Customizer Guide](#-developer--customizer-guide-profile-2)** |

---

## 🚀 User Quick Start (Profile 1)
*Use gripm in any repository without touching or cloning the gripm codebase.*

### Step 1: Install Gripm Board
Requires Node.js 22.6.0 or later. Install the CLI from npm:
```bash
npm install -g @gripm/board
```
Or run it on demand with `npx @gripm/board`.

### Step 2: Initialize Your Project (optional)
Open a terminal in your project's root directory (e.g. `my-app`) and run:
```bash
gripm --init
```
The setup wizard can configure a single-project or multi-project workspace and optionally add agent guidance, `AGENTS.md`, npm scripts, and recommended `.gitignore` entries. You can also choose options non-interactively with `--yes` / `-y`.

*Non-interactive flag for CI or automatic setup:*
```bash
gripm --init -y
```

### Detaching gripm from a repository

To remove gripm from a project without deleting its backlog files, use the
`uninstall` command to choose the scope:

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

- 🔒 `backlog/` and `BACKLOG.md` are preserved by uninstall in every mode and
  with every flag. The removable paths are listed explicitly and exclude them.
- 🔒 Your own script named `board` is preserved. Only the scripts gripm
  injected get reverted.
- 🔒 A global purge tells you how many registered projects will be deregistered
  and asks for confirmation.

### Step 3: Daily Usage — Open Your Board
Whenever you want to work on your project, simply run:
```bash
gripm
```
If you enabled the optional `board` script during initialization, you can also run `npm run board`. The CLI opens the board in your default browser; its default port is `4100` and can change if that port is already in use.

### Step 4 (Optional): Connect Your AI Agent (Cursor / Claude / Antigravity)
Configure Gripm MCP in your AI client's MCP settings. The client starts the process when it connects; you do not normally launch it in a separate terminal. Point it at the project explicitly with `--repo`:
```json
{
  "mcpServers": {
    "gripm": {
      "command": "gripm-mcp",
      "args": ["--repo", "/absolute/path/to/my-app"]
    }
  }
}
```
The MCP server uses the selected project's backlog. If `--repo` is omitted, it uses the working directory supplied by the MCP client. If Board is not installed globally, configure the client to start it with `npx` instead:

```json
{
  "mcpServers": {
    "gripm": {
      "command": "npx",
      "args": ["-y", "-p", "@gripm/board", "gripm-mcp", "--repo", "/absolute/path/to/my-app"]
    }
  }
}
```

Its available tools are listed below.

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
- `--hub`: Force multi-project hub mode (loads and manages all registered projects in `~/.gripm/registry.json`).
- `--port <number>`: Specify a custom port (e.g. `gripm --port 4200`).
- `--repo <path>`: Target an explicit repository path instead of the current working directory. Supported by Board, MCP, and `playbook sync`.

**Disabling update checks:**
The CLI checks GitHub Releases in the background and caches the result for 24 hours. To disable it:

```bash
GRIPM_NO_UPDATE_CHECK=1 gripm
```

In PowerShell:

```powershell
$env:GRIPM_NO_UPDATE_CHECK = "1"; gripm
```

---

## 🤖 MCP Server Included with Board (12 Tools)

The `@gripm/board` package includes an MCP server over `stdio` (`bin/gripm-mcp.js`). It runs as a separate process without the web UI, uses Board's backlog engine, and is not a separately published package. Configure it in your AI client as shown in the quick start; the client starts it when needed. For development from the Gripm repository:
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
| `gripm_create_retro` | Generates a structured retrospective after an iteration is completed. | `projectId`, `sprintId`, `sprintName`, `whatWentWell`, `whatWentWrong`, `whatToImprove` |
| `gripm_list_retros` | Lists historical retrospectives recorded in `backlog/retros/`. | `projectId` |

---

## 🔒 Privacy & Git Strategies: Public vs. Private Repositories

gripm is local-first: backlog data is stored in local files you control and is not uploaded to a Gripm service. The CLI may contact GitHub Releases to check for updates; this check is cached and can be disabled with `GRIPM_NO_UPDATE_CHECK=1`. Choose a Git strategy based on your repository's visibility:

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
- `.gitignore` only affects untracked files. If backlog files are already tracked, adding these rules will not remove them from Git history or stop them from being committed.
- **Benefits**: You and your local AI coding agents enjoy full gripm Kanban, Sprint Hub, and MCP tool capabilities locally, but no task details, internal business ideas, technical debt, or unreleased vulnerability disclosures are ever pushed to GitHub.
- **Use when**: You work on public or client-facing repositories where task tracking must remain strictly confidential.

#### Strategy 3: Dedicated Private Backlog Repository
- Keep the public repository completely clean of backlog files, and maintain a private repository (e.g., `my-project-backlog`) for tracking.
- Run gripm or point MCP to that directory:
  ```bash
  gripm-mcp --repo /path/to/private-backlog
  ```

---

## 📜 Backlog History and Git

Gripm provides project history and a trash view, including permanent purge actions. If you want a Git audit trail, keep the relevant backlog files tracked and commit their changes; local-first storage alone is not a backup.

Released work can also be summarized in `CHANGELOG.md`. Treat Git history as the durable record only for files and changes that you choose to commit.

---

## 🛠️ Verification & Backlog Integrity Commands

gripm includes checks to detect inconsistencies between the backlog and its consolidated documentation:

```bash
# Verify integrity between code, criteria checkboxes, and task states
npm run backlog:check

# Auto-reconcile completed tasks and update the consolidated BACKLOG.md
npm run backlog:sync

# Static UX & Performance audit (zero CLS, layout shifts, touch targets)
npm run audit:ux

# Refresh the baseline after an intentional UX change, so CI only flags new
# regressions instead of the known cosmetic observations
npm run audit:ux:baseline

# Production TypeScript, Vite bundle and standalone binaries packaging
npm run build
```

---

## ✨ Features

- **Product backlog:** create and organize work items with acceptance criteria, labels, priorities, and relationships.
- **Two storage formats:** use Markdown task files or a single JSON backlog, with project settings for conversion.
- **Flexible workflows:** use continuous Kanban flow or plan work in iterations; configure columns, item types, and work-in-progress limits.
- **Releases:** group work by delivered value and compile release notes independently of iteration planning.
- **AI-agent access:** connect through the included MCP server, which exposes tools to read and update the same Board backlog.
- **Local project setup:** initialize Board with `gripm --init`; optionally add agent instructions, npm scripts, and Git ignore rules.
- **Cross-platform CLI:** open the local board, select a project, configure its port, or run MCP without opening the UI.

---

## 🐶 Dogfooding ("Git Building Git")

This repository uses Gripm Board to manage its own development. Its backlog and project configuration are available in [`backlog/tasks/`](backlog/tasks/) and `.gripm/`.

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

To try the MCP server from a terminal, run this from the target project:

```bash
npx -y -p @gripm/board gripm-mcp --repo .
# or once installed globally:
gripm mcp --repo .
```

For regular use, configure MCP in your AI client's settings as shown in the quick
start; the client manages the server process.

The task lifecycle that every change follows is documented in
[AGENTS.md](AGENTS.md).

---

## 📄 License

MIT © 2026 gripm Contributors
