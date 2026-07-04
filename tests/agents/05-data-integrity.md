# Agent 5 — Data Integrity (model: sonnet, read-only + node in sandbox)

Goal: state shape, snapshots, migration, and caps are sound. Static/analytical — no browser needed.

## Checklist
1. Every key in the `state` literal (js/core.js) is captured by `STATE_DEFAULTS`; `resetStateToDefaults()` restores all allowed keys. Flag any state key written elsewhere in js/ that is missing from the initial literal (it would survive Reset = ghost state).
2. XMPL snapshots (bottom of js/program.js): each `.data` parses as valid JSON and contains an entry for every persistent (non-underscore) key in the live state shape. Missing keys = High (silent failures on load).
3. Migration shim `migrateLegacyStorageKeys()`: copies state/ts/snapshots from both `larsen-grc-*` and `hawthorn-grc-*` prefixes, removes originals, and is idempotent (safe to run twice).
4. `validateProgramShape`: rejects unknown root types, type-mismatched fields, bad `baseline` values. Write 5 adversarial fixtures (string root, baseline:'X', users as object, auditTrail as string, huge nesting) and confirm each is rejected in a node harness.
5. Caps: `addAuditEntry` caps auditTrail at 800; `logFieldChange` caps changeLog at 2000 — verify the trim logic actually slices oldest-first.
6. `importProgramFromFile` auto-snapshots before applying; snapshot restore routes through `openSnapshotRestoreConfirm` with auto-backup.

## Output
Findings table: Severity | File:line | Issue | Evidence. End with PASS/FAIL.
