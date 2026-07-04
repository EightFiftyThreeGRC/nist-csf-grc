# Agent 6 — Independent Verifier (model: sonnet, FRESH agent — must not have produced any fix in this run)

Goal: review every code change the orchestrator made during this QA run before the run is declared green.

## Checklist
1. Input: the full diff of this run (`git diff` if repo is git-tracked, else the orchestrator's list of edited files + before/after).
2. Convention compliance (per CLAUDE.md): globals only (no modules/classes/imports); innerHTML rendering into existing containers; re-renders from event handlers wrapped in `setTimeout(fn,0)`; string args in generated `onclick` escaped via escKey/escapeHTML; new state keys added to the `state` literal so STATE_DEFAULTS captures them.
3. Branding: no KPMG/Larsen/Hawthorn/Acme introduced.
4. Regression reasoning: for each changed function, list its callers (grep) and confirm the change can't break them (signature, return shape, side effects).
5. Blast radius: flag any change that touches persistence (saveToStorage/markDirty), migration, or snapshot code as needing a re-run of Agent 5; any UI render change as needing a re-run of Agent 1 on the affected tab.
6. Verdict per change: APPROVE / APPROVE-WITH-NITS / REJECT (with the specific line and reason).

## Output
Per-file review notes + overall verdict. The QA run is green only if all changes are APPROVE or APPROVE-WITH-NITS and required re-runs passed.
