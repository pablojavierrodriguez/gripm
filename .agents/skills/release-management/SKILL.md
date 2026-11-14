---
name: release-management
description: Orchestrates release cuts, SemVer determination, changelog compilation, production deploy hooks, and post-deploy backlog reconciliation. The only role authorized to transition items from ready to done upon actual production deployment.
---

# Release Management Skill - Gripm Board

## Mission and Authority

Release Management is the sole authority responsible for cutting versions, packaging deliverables, and executing transitions from `ready` to `done` upon verifiable production deployment.

> **Fundamental Invariants:**
> 1. **No item can exist in production that is not in `done`**, and **no item can be marked `done` without an actual release deployment**. Marking `done` without deploying is a state lie.
> 2. **Decoupled Sprints and Releases:** Sprints and releases have no 1:1 coupling. Releases are cut strictly by **delivered value** grouping all available `ready` items (historical or current), with or without an active sprint.
> 3. **Trunk Discipline (Anti-Dev-Production-Deploy - DEV-340):** Production deployments are executed strictly from the canonical `main` trunk with a clean working tree. Deploying from `dev` or working branches is prohibited.
> 4. **Standard Hyphen Rule (Anti-Em-Dash / Anti-AI):** Never use em-dash or en-dash in browser titles, UI text, select options, release titles, release notes, `CHANGELOG.md`, `releases.json`, or documentation. Always use the standard hyphen `-` with spaces (` - `).

---

## Universal 6-Phase Release Protocol (Gripm Board Ecosystem)

### Phase 0: Pre-Cut Audit and Clean Baseline
Before cutting a release, audit trunk status and candidate pool:
1. Ensure the local working tree is clean:
   ```bash
   git status --porcelain
   ```
   Must output empty. Any unstaged or untracked changes must be stashed, committed, or discarded before proceeding.
2. Inspect the commits to be released on the integration trunk:
   ```bash
   git log main..dev --oneline
   ```
3. Audit candidate tasks:
   Verify all items intended for this release reside in `status: ready` in `backlog/tasks/`. Items in `review` or `doing` must not be bundled.

---

### Phase 1: Pre-Release Quality Gate (Full Verification Pyramid)
Run the full verification pyramid in strict sequence. All checks must exit with code 0:

1. **Verify Defect Classes Outside Pyramid:**
   ```bash
   node scripts/verify-changes.js --all
   ```
   Validates YAML syntax, UTF-8 clean encoding, dynamic imports, and closed handles.
2. **Strict Typecheck:**
   ```bash
   npx tsc --noEmit
   ```
   Must pass with 0 TypeScript compiler errors.
3. **Headless Test Suite:**
   ```bash
   npm test
   ```
   Runs the unified 19-step test runner reporting step durations and ensuring 0 regressions.
4. **Browser Smoke Test:**
   ```bash
   npm run test:ui
   ```
   Executes headless Playwright smoke tests for UI stability.
5. **Publish Surface Guard (Anti-Data-Leak):**
   ```bash
   npm run publish:check
   ```
   Ensures the npm tarball contains zero local user data, no internal Playbook governance files, and clean distribution surface.
6. **Backlog and Release Integrity:**
   ```bash
   npm run backlog:check
   ```
   Verifies tasks, released items, sprint IDs, and documentation synchrony.

---

### Phase 2: Objective SemVer 2.0 Determination
Determine version bump based on delivered value in candidate `ready` items:
- **MAJOR (X.0.0):** Incompatible API changes, breaking storage/schema contracts, or major architectural restructuring.
- **MINOR (1.X.0):** New backward-compatible features, new CLI commands, new MCP tools, or new UI views.
- **PATCH (1.11.X):** Backward-compatible bugfixes, security patches, performance optimizations, or maintenance.

Update the version field in `package.json` to the target version `X.Y.Z`.

---

### Phase 3: Release Notes Synchronization (100% User-Facing)
1. Register or update the release object in `backlog/releases.json`:
   - `version`: Target version string (e.g. `"1.12.0"`).
   - `date`: Release date in ISO format (`"YYYY-MM-DD"`).
   - `title`: Release title adhering strictly to the Anti-Em-Dash rule (e.g. `"v1.12.0 - Title Description"`).
   - `summary`: Concise executive summary of delivered value.
   - `itemCodes`: Exhaustive array of task IDs included (e.g. `["DEV-367", "DEV-368"]`).
   - `markdownContent`: User-facing release notes organized by sections (Features, Fixes, Architecture). Zero internal issue numbers in titles, zero em-dashes or en-dashes.
2. Compile `CHANGELOG.md`:
   ```bash
   npm run changelog
   ```
3. Verify changelog synchronization:
   ```bash
   npm run changelog:check
   ```
   `git diff --quiet -- CHANGELOG.md` must produce zero diff.
4. Validate release notes extraction:
   ```bash
   node scripts/extract-release-notes.js
   ```
   Verifies that `release-title.txt` and `release-notes.txt` are cleanly generated without syntax errors.

---

### Phase 4: Canonical Git Release Protocol
> [!CAUTION]
> **Git Discipline Guardrail:** NEVER execute `git commit` or `git push` without explicit verbal authorization from the user for EACH individual command.

When verbally authorized:
1. Commit release metadata on `dev`:
   ```bash
   git add package.json backlog/releases.json CHANGELOG.md BACKLOG.md backlog/tasks/
   git commit -m "chore(release): vX.Y.Z - Release title"
   ```
2. Fast-forward merge `dev` into `main`:
   ```bash
   git checkout main
   git merge dev --ff-only
   git push origin main
   ```
3. Return to integration trunk:
   ```bash
   git checkout dev
   ```

---

### Phase 5: Canonical Deploy Hooks

Gripm Board maintains two production deploy hooks:

#### Deploy Hook A: Web Sandbox Production Deploy (Vercel)
Deploys the web application to the public production sandbox (`https://gripm.vercel.app`):
- Guarded mechanically by `scripts/deploy-prod.js` (DEV-340 / Anti-Dev-Production-Deploy).
- Must run strictly from `main` with a clean working tree:
  ```bash
  git checkout main
  npm run deploy:prod
  git checkout dev
  ```
- Aborts immediately if executed from `dev` or if uncommitted changes exist.

#### Deploy Hook B: NPM Package Distribution with Provenance (CI/CD)
Publishes `@gripm/board` to npmjs and generates the official GitHub Release:
- Executed automatically by `.github/workflows/ci.yml` upon push to `main`.
- Decoupled and idempotent steps:
  1. Checks `npm view @gripm/board@X.Y.Z`; publishes with `--provenance` if not yet published.
  2. Checks `git ls-remote` for `vX.Y.Z`; creates and pushes annotated tag if missing.
  3. Checks `gh release view vX.Y.Z`; extracts release notes via `node scripts/extract-release-notes.js` and creates release with `--latest` flag if missing.

---

### Phase 6: Post-Deploy Backlog Reconciliation
After deployment verification in production:
1. Transition each delivered task in `backlog/tasks/` from `ready` to `done`:
   - Set `status: done`.
   - Set `releasedAt: vX.Y.Z`.
2. In `backlog/releases.json`, mark `status: "released"`.
3. Reconcile and regenerate consolidated backlog:
   ```bash
   npm run backlog:sync
   npm run backlog:check
   ```
4. Verify invariant:
   - Zero tasks marked `done` without being in a deployed release.
   - All acceptance criteria marked `- [x]`.
