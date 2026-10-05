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

## Atomic Commits & Clean Releases

- Ensure all tests and builds pass cleanly before staging commits.
- Never chain hidden or stealth commits.
