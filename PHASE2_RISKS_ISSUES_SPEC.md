# Phase 2 — Risks & Issues (Design Spec)

Status: **draft for review** · Owner: program owner · Last updated: 2026-07-04

Phase 1 builds the program (ISP → domain policies → controls → SSP attestation →
review → authorization). Phase 2 adds the missing dimension: **identifying,
triaging, and managing risks and issues** that the program surfaces. This
replaces the removed Phase-1 "Findings & POA&M" tab with a deliberate design.

NIST anchors: SP 800-30 (risk assessment), PM-9/PM-28 (risk strategy & framing),
CA-5 (POA&M), RA-3 (risk assessment control).

---

## 1. Taxonomy — what is a Risk vs. an Issue?

| | **Risk** | **Issue** |
|---|---|---|
| Nature | *Potential* adverse event | *Actual, present* deficiency |
| Question | "What could go wrong?" | "What is wrong right now?" |
| Scored by | Likelihood × Impact → rating | Severity (Critical/High/Med/Low) |
| Resolved by | Treatment: Accept / Mitigate / Transfer / Avoid | Remediation plan → verify → close |
| NIST home | 800-30, PM-9, RA-3 | CA-5 (POA&M) |
| Register | Risk register | Issues list (POA&M-compatible) |

They interlink: an Issue can evidence a Risk (`issue.riskId`), and mitigating a
Risk can spawn Issues (remediation work items). A "finding" from Phase 1
vocabulary is simply an Issue whose source is an assessment/review.

## 2. Where risks & issues come from (origination hooks)

The core Phase-2 idea is **identification**: the program already generates
signals; Phase 2 turns them into a triage queue instead of losing them.

| # | Signal (existing Phase-1 data) | Suggested record |
|---|---|---|
| H1 | SSP attestation `Does Not Comply` (`sspAttestations[scope][ctrl].status`) | Issue (control gap on that asset/process) |
| H2 | SSP attestation `Partially Complies` | Issue (lower default severity) |
| H3 | Control past `controlDeadlines[ctrl]` and not Implemented | Issue (missed implementation) |
| H4 | Control test failure (`controlTestResults[ctrl].result === 'Fail'`) | Issue |
| H5 | ATO conditions (`atoDecisions[boundary].conditions[]`) | One Issue per condition, due = ATO expiry |
| H6 | Policy exception granted (ISP exceptions language already says "tracked in the risk register") | Risk (with acceptance workflow) |
| H7 | Reviewer raises from SSP review screen (per-control comment → "Raise issue") | Issue, pre-linked to control + scope |
| H8 | Manual entry (any workspace role can propose) | Risk or Issue, status `Proposed` |

Hooks H1–H5 are **computed suggestions** (derived at render time, deduped by a
stable key like `h1:{scopeId}:{ctrlId}`), shown in a **Triage queue**. Nothing
is auto-created: a triager (CISO/ISSM/program owner) promotes a suggestion to a
real Risk/Issue or dismisses it (dismissals persisted in
`riskTriageDismissals` so they don't reappear). This keeps the register
intentional, not noisy.

## 3. Data model (state keys)

Two new persisted arrays plus one dismissal map — added to the `state` literal
in `js/core.js` (so STATE_DEFAULTS/reset/import/export pick them up
automatically):

```js
risks: [],   // risk register
issues: [],  // POA&M-compatible issues list
riskTriageDismissals: {},  // { 'h1:asset-3:AC-2': { by, at } }
```

### Risk record

```js
{
  id: 'risk-<ts>-<rand>',
  title: '',                  // short name
  statement: '',              // "If <event>, then <consequence>"
  source: 'manual'|'exception'|'issue-rollup'|'triage:h6',
  controlIds: [], scopeIds: [], families: [],   // optional links
  likelihood: 'Low'|'Medium'|'High',
  impact:     'Low'|'Medium'|'High',
  // rating is COMPUTED (3×3): H×H=Critical; H×M/M×H=High; M×M/H×L/L×H=Moderate; else Low
  treatment: 'Mitigate'|'Accept'|'Transfer'|'Avoid'|'',   // '' until triaged
  treatmentPlan: '',
  ownerName: '', ownerEmail: '',
  status: 'Proposed'|'Open'|'In Treatment'|'Accepted'|'Closed',
  acceptance: null | { by, byEmail, at, rationale, expiresAt },  // required for Accepted
  reviewBy: 'YYYY-MM-DD',     // next scheduled review
  issueIds: [],               // linked issues
  createdAt, createdBy, closedAt, closedBy
}
```

### Issue record (POA&M-compatible, CA-5)

```js
{
  id: 'issue-<ts>-<rand>',
  title: '', description: '',
  source: 'manual'|'triage:h1'|'triage:h3'|'ato-condition'|'ssp-review',
  sourceKey: '',              // the triage key or condition ref, for dedupe
  controlIds: [], scopeId: '', // asset/process id when applicable
  severity: 'Critical'|'High'|'Medium'|'Low',
  remediationPlan: '',
  milestones: [ { label, due, doneAt } ],   // optional, true POA&M style
  dueDate: 'YYYY-MM-DD',
  assigneeName: '', assigneeEmail: '',
  status: 'Proposed'|'Open'|'In Progress'|'Remediated'|'Verified'|'Closed'|'Risk Accepted',
  verification: null | { by, byEmail, at, note },  // required for Verified/Closed
  evidenceRef: '',            // link/path — rendered via safeUrl()
  riskId: '',                 // optional link to a risk
  createdAt, createdBy, closedAt, closedBy
}
```

`Risk Accepted` on an Issue requires (or creates) a linked Risk with a completed
`acceptance` record — acceptance always lives on the Risk side so there is one
place to review expiring acceptances.

## 4. Separation of duties

Consistent with Phase 1's SoD model (client-enforced, session-identity based):

- **Risk acceptance** — recorded only by the program owner or the boundary's AO
  (`isAdminSession()` / AO match), and **not** by the risk's own owner.
- **Issue verification/closure** — verifier must differ from the assignee
  (match by session identity tokens, same mechanism as SSP reviewer checks).
- **Triage** (promote/dismiss suggestions) — program owner, CISO, ISSM.
- Everyone with a workspace role can **propose** (status `Proposed`).
- All transitions call `addAuditEntry('risk'|'issue', id, msg)`; free-text edits
  go through `logFieldChange`.

## 5. UI

**Sidebar (Program section):** one item — **"Risks & Issues"** (tab id `risk`),
with an overdue/pending-triage badge. Three views inside the tab:

1. **Triage** — the identification queue. Suggested candidates from H1–H5
   grouped by source, each with [Promote to Issue] [Promote to Risk] [Dismiss].
   Empty state explains the hooks.
2. **Risk register** — table (title, rating chip, treatment, owner, status,
   review date) + a 3×3 heat-map summary strip; row opens an edit drawer.
   Filter by status/rating/family.
3. **Issues (POA&M)** — table (title, severity, control(s), scope, assignee,
   due date with overdue highlight, status); row opens an edit drawer. Filter
   by status/severity/overdue. CSV export for auditors (POA&M format).

**Command Center:** next-actions for (a) suggestions pending triage (owner/
CISO/ISSM), (b) my assigned open issues past/near due, (c) my risks past
`reviewBy`, (d) risk acceptances expiring within 30 days. One KPI tile: open
issues + open risks (replaces nothing — grid currently has 4 tiles; swap
"Policies approved" back to a combined "Open risks & issues" count).

**Reports:** a "Risk & issue posture" panel — counts by severity/rating, top-5
overdue, acceptance expirations. Feeds the existing print/report flow.

**SSP review screen (H7):** in the reviewer's per-control comment block, a
"Raise issue" button pre-fills an Issue draft (control, scope, description from
the comment).

**Role visibility (`ROLE_TABS`):** `risk` tab for `ciso`, `issm`,
`control-owner`, `asset-owner`, `assessor`, `ao` (scoped rendering: non-triage
roles see only their assigned/proposed items in the register/issue views).

## 6. Out of scope for Phase 2 (companion/backlog)

- **Backend normalization** (`program_members`, per-table RLS) — separate
  workstream; risks/issues ride in the existing single-blob sync.
- Quantitative risk scoring (FAIR-style) — the 3×3 qualitative model matches
  800-30 and the tool's audience; revisit later.
- Automated re-open when a dismissed hook's signal recurs/worsens (e.g.
  Partially → Does Not Comply). Design keeps `sourceKey` so this is easy later.
- Notifications/email on assignment (needs backend work).

## 7. Implementation milestones

| M | Scope | Touches |
|---|---|---|
| M1 | State keys, tab shell, sidebar, manual CRUD for risks + issues, drawers, audit wiring | `core.js`, `app.html`, `app.js`, new `js/risk.js` |
| M2 | Triage queue: H1–H5 computed suggestions, promote/dismiss, dedupe keys | `js/risk.js` |
| M3 | H6/H7 entry points (exception → risk; SSP review → issue), Command Center actions + KPI, Reports panel, badges | `risk.js`, `hub.js`, `reports.js`, `assets.js`, `program.js` |
| M4 | SoD: acceptance + verification flows, acceptance expiry review, `Risk Accepted` issue↔risk link | `risk.js`, `cloud-auth.js` helpers |
| M5 | POA&M CSV export, XMPL demo snapshot seed data, smoke tests, docs | `risk.js`, `core.js`, `tests/e2e` |

Each milestone ships independently behind nothing — the tab is useful from M1.

## 8. Open questions (need product decisions)

1. **Who accepts risk** — program owner only, or also the AO for
   boundary-scoped risks? (Spec assumes both.)
2. **Severity → due-date defaults** for issues (e.g. Critical 30d / High 60d /
   Medium 90d / Low 180d)? Spec assumes yes, editable.
3. Should **dismissed triage suggestions** be visible in an "archived" list for
   audit, or is the `riskTriageDismissals` record (who/when) enough?
4. Naming: sidebar label **"Risks & Issues"** vs. keeping auditor-familiar
   **"POA&M"** for the issues view header. Spec uses "Issues (POA&M)".
