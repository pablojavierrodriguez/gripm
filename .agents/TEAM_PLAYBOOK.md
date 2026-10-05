# Multi-Agent Team Playbook — Agile Autonomous Framework

This playbook establishes a collaborative, autonomous operating loop between specialized agent roles and human leads to build and maintain high-grade software products.

---

## 🚦 Dynamic Decision Matrix (System Autonomy)

The user should never have to manually specify when to trigger a sprint or which role to activate. The system automatically classifies incoming requests into one of three operating tracks:

| Operating Track | Typical Triggers | Roles Involved | Overhead / Documentation |
| :--- | :--- | :--- | :--- |
| **Mode 1: Surgical Focus** *(Fast-Track)* | Targeted bugfixes, calculations/invariants, copy/typo tweaks, linter fixes, failing unit tests. | **Principal Engineer** (direct, exclusive control). | **Zero bureaucracy.** No sprint doc. Atomic modification + verification (typecheck + tests). |
| **Mode 2: Tactical Duo** *(UX + Engineering)* | Component redesign, new modals/sheets, ergonomics & touch targets, visual charts. | **Product Designer** + **Principal Engineer** (+ QA check). | **Lightweight.** Plan outlined directly in chat. No sprint doc unless touching database schema. |
| **Mode 3: Full Sprint & Backlog Flow** | Major backlog feature, database schema migrations, complex business workflows. | Loop: **PM Orchestrator** ➔ **Designer** ➔ **Principal Engineer** ➔ **QA Auditor** ➔ **Release Management**. | **Formal.** Tracked via backlog task or sprint spec, verified through the Verification Pyramid and packaged by value. |

---

## 🤖 Sub-Agent Autonomy & The Verification Pyramid

The team decides when to spawn sub-agents (e.g. browser subagents, background jobs) under a golden rule:

> **"Atomic focus on domain logic; parallel hands on exploration and verification."**

### 🟢 When to Parallelize (Sub-Agents / Background Tasks):
1. **Auditing Visual Layouts (`browser_subagent`):**
   - Reserved **exclusively** for visual layout/CSS issues not deducible statically, complex viewport rendering, or upon explicit user request.
2. **Exploratory Research & Benchmarking (Market Researcher):**
   - Investigate industry references (Linear, Stripe, Notion, Obsidian) or analyze external API documentation without polluting the core technical context.
3. **Accessibility (a11y) & Static Code Audits:**
   - Execute contrast ratios, accessibility checks, or static UX scans (`npm run audit:ux`) asynchronously.

### 🔴 When to Keep STRICT ATOMIC FOCUS (Single-thread, No Sub-Agents):
1. **Domain Logic & State Invariants:**
   - Core business logic, central state stores, and data integrity require strict sequential reasoning. Fragmenting domain logic across parallel subagents risks race conditions and contradictory code.
2. **Database Schemas & Migrations:**
   - Schema foundations, migrations, and Row-Level Security (RLS) policies must be designed and validated by a single technical mind to guarantee idempotence.
3. **Core Architectural Refactoring & Backlog Parsers:**
   - Backlog sync engines, parsers, and global context providers require end-to-end coherence.

---

## 🔄 The Agile Delivery Flow (The 5 Phases)

```
[ 1. Discovery & PM ] (PM Orchestrator / PO)
          │
          ▼
[ 2. Research & Design ] (Market Researcher + Product Designer)
          │
          ▼
[ 3. Dev Execution ] (Principal Engineer) ──► status: doing ➔ review
          │
          ▼
[ 4. QA Gate & Signoff ] (Rigorous QA Auditor) ──► status: review ➔ ready (Formal Handover)
          │
          ▼
[ 5. Release Management & Prod ] (PO + Delivery Lead) ──► status: ready ➔ done (Deployed)
```

### Phase 1: Briefing & Alignment (PM Orchestrator / PO)
- **Input:** Backlog item or user requirement.
- **Action:** Initializes task or sprint spec using `SPRINT_SPEC_TEMPLATE.md`.
- **Output:** Clear problem statement, target personas, and measurable acceptance criteria (ACs).

### Phase 2: Benchmarking & Experience Design (Researcher + Designer)
- **Action:** Analyzes world-class benchmarks (Linear, Notion, GitHub Projects) and specifies visual tokens, responsive behavior, and touch ergonomics (≥ 44px).
- **Output:** Populates design spec, interactive states, and edge-case handling.

### Phase 3: Dev Execution (`doing` ➔ `review`) (Principal Engineer)
- **Action:** Implements modular, strictly typed code adhering to domain invariants.
- **Ticking ACs:** Checks off acceptance criteria in real-time (`- [x]`).
- **Output:** Passes the item to `status: review` upon completing implementation and local testing.

### Phase 4: QA Gate (`review` ➔ `ready`) — Formal Handover of Development (QA Auditor)
- **Action:** Audits the item using the **Verification Pyramid (Zero-Waste Testing)** in strict sequence:
  1. ✅ `tsc --noEmit` (strict typing, 0 errors)
  2. ✅ Unit & integration tests (`npm test`, headless code 0)
  3. ✅ Backlog & spec consistency checks
  4. ✅ Production build (`npm run build`)
- **Anti-Browser-Subagent Inefficiency:** Prohibited to invoke `browser_subagent` for logic, state, API contracts, or persistence that can be audited in milliseconds headlessly. Reserved strictly for static-undeducible CSS/layout issues or explicit user prompt.
- **Output:** Once verified, moves the item to `status: ready`.
- **`ready` is the formal delivery of development**: the item is validated and immediately eligible for packaging and deployment.

### Phase 5: Release Management & Prod Implementation (`ready` ➔ `done`)
- **Packaging by Delivered Value:** Release Management (PO + Scrum/Delivery Lead) groups available items in `ready` based on value delivered.
- **Decoupled Sprints & Releases:** Sprints and releases have no 1:1 coupling. Releases are created based on delivered value with any available `ready` items (historical or from the active sprint), with or without an active sprint.
- **Production Deployment (`done`):** Upon committing and pushing the release package to production (main cloud), the packaged items transition to `status: done`.
- **Fundamental Invariant:** **No item can exist in production that is not in `done`**.

---

## ⏱️ Sprint Lifecycle & PO Sovereignty

1. **Fixed Timebox:** A sprint concludes when its scheduled timebox expires (fixed duration), regardless of whether all planned items are finished. Incomplete items are replanned to the next sprint or returned to the backlog.
2. **Continuous Productivity:** If all items in a sprint are completed before the timebox expires, the PO expands the sprint scope by pulling in newly refined backlog items to maintain productivity. Sprints rarely conclude prematurely.
3. **No Autonomous Close or Retro:** The AI agent **NEVER** closes a sprint or executes a retrospective autonomously by deduction. Both actions require explicit, textual instructions from the PO (e.g., *"close the sprint"*, *"run the sprint retro"*).
4. **Mandatory Retro Outputs:** Update rules in `AGENTS.md`, refine skills, and create backlog tasks for all identified technical debt or process improvements.

---

## 🧠 Continuous Learning Protocol (Knowledge Feeder)

At the conclusion of each release or sprint:
1. **New UI or input discoveries:** Documented into relevant design/form skills.
2. **Superior architectural patterns:** Documented as an Architectural Decision Record (ADR).
3. **No bug or friction is solved twice:** Converted into a permanent project rule in `AGENTS.md`.
