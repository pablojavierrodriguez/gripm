# Git Workflow & Commit Governance

Strict rules governing Git operations to prevent unintentional code loss or vague commit histories.

---

## Explicit Verbal Authorization Required

> [!CAUTION]
> **NEVER execute git commits or pushes without explicit, verbal permission from the user for EACH action.**

- **Never Infer Permissions:** Previous approval of a commit or push NEVER grants tacit approval for subsequent actions.
- **Task Words Are NOT Commit Permission:** Words like *"looks good"*, *"ok"*, *"proceed"*, *"go ahead"*, or *"done"* mean **implement or edit the code only**, NEVER run `git commit` or `git push`.
- **Explicit Keyword Rule:** Every commit and every push requires an individual message containing the explicit word *"commit"* or *"push"*.

---

## Descriptive and Structured Commit Messages

- **No Generic Messages:** Vague commits (e.g., *"fix bugs"*, *"update files"*, *"wip"*) are strictly forbidden.
- **Structured Commit Anatomy:**
  - **Header:** Meaningful title following Conventional Commits (`feat(...)`, `fix(...)`, `refactor(...)`, `docs(...)`).
  - **Body:** When a commit touches multiple areas, include a structured bulleted summary detailing the exact scope of changes so anyone outside the team understands what was changed and why.

---

## Consolidated Task Commits & Clean Releases

- **Consolidated Cadence:** 1 verified task in `ready` = 1 clean, atomic commit including the code and its associated `DEV-XXX` task markdown file. Do not create noisy micro-commits during scratch work or exploration.
- **Pre-Commit Enforcement:** Ensure pre-commit verification hooks pass cleanly (typecheck, tests, backlog sync) before completing commits.
- **No Stealth Commits:** Never chain hidden or stealth commits. Maintain explicit task ID in commit title (`feat(DEV-XXX): ...` or `fix(DEV-XXX): ...`).
