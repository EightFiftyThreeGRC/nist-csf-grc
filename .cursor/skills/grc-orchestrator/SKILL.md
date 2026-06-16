---
name: grc-orchestrator
description: >-
  Orchestrate parallel specialist subagents for EightFiftyThree GRC work. Use when
  making large changes, audits, refactors, or multi-domain improvements. Spawns
  UX, compliance, testing, and architecture agents; merges findings; executes fixes.
disable-model-invocation: false
---

# EightFiftyThree GRC — Orchestrator

You are the **orchestrator**. For any non-trivial task, do NOT work solo. Launch parallel specialists, merge their reports, then implement in priority order with test loops.

## When to orchestrate

- User asks for "big", "keep improving", audits, or multi-area work
- Touching 3+ modules or HTML + JS + CSS + CI together
- Before/after large commits

Skip orchestration for single-file typo fixes or one-line answers.

## Specialist roster

Launch these in **parallel** (one Task per row):

| ID | subagent_type | Focus | Return format |
|----|---------------|-------|---------------|
| `ux` | explore | Sidebar, wizards, Apple-like UX, a11y, copy, mobile | Top 5 issues + 3 quick wins |
| `compliance` | explore | NIST 800-53 alignment, POA&M, frameworks crosswalk, RMF gaps, evidence/SharePoint | Top 5 gaps + data model notes |
| `quality` | shell | `node scripts/check-all.js`, `npm run test:e2e`, CI workflows, broken paths | Pass/fail + exact errors |
| `architecture` | explore | Module boundaries, dead code, git hygiene, landing vs app split, state shape | Top 5 structural risks |

Optional fifth agent when relevant:

| `security` | explore | Entra ID, localStorage, XSS in innerHTML/onclick, secrets | Top 5 risks |

## Orchestrator workflow

```
1. Read CLAUDE.md + git status (parallel with agent launch)
2. Launch specialists (all at once)
3. Merge → single prioritized backlog (P0 broken, P1 user-facing, P2 polish)
4. Implement P0–P1; re-run quality agent (test:e2e + check:js)
5. Report: what each agent found, what you fixed, what's deferred
```

## Project conventions (pass to every specialist)

- App entry: `app.html`; landing: `index.html`
- Modules: `js/*.js` globals, load order in `app.html`
- No KPMG/employer branding; brand is **EightFiftyThree GRC**
- Test: `npm run check:js` and `npm run test:e2e`
- Do not commit unless user asks

## Merge template

```markdown
## Orchestrator summary
### P0 (fix now)
- ...
### P1 (this session)
- ...
### P2 (backlog)
- ...
### Agent inputs
- **UX**: ...
- **Compliance**: ...
- **Quality**: ...
- **Architecture**: ...
```

## Re-run rule

After implementing P0/P1, always re-invoke **quality** (or run tests yourself) before declaring done.
