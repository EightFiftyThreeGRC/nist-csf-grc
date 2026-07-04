# Agent 3 — Compliance Content (model: opus, read-only + web research; use nist-rmf-advisor and iso-27001-advisor skills if available)

Goal: the NIST/framework content is accurate. Judgment-heavy — score with a rubric, cite sources.

## Checklist
1. Baseline counts: `BASELINE_COUNTS` in `js/core.js` vs NIST SP 800-53B (Low/Moderate/High, and privacy overlay behavior). Explain any delta (e.g., enhancements counted separately).
2. Control catalog spot-check: pick 20 controls across families in `js/nist-control-text.js`; verify ID, name, and requirement text against the official Rev. 5 catalog. Any wrong control text = Critical.
3. Family list: 20 families in `FAMILIES` match Rev. 5 (incl. PT if privacy overlay logic references it).
4. Terminology: SSP, POA&M (CA-5/PM-4), ATO/IATT/Denial, RMF phase language in UI copy — flag anything a federal assessor would wince at. SSP submission must NOT be described as formal authorization.
5. Crosswalks (`js/frameworks.js`): sample 10 NIST→ISO 27001 Annex A (2022) mappings and 10 NIST→SOC 2 TSC mappings for defensibility; check HIPAA Security Rule mappings reference real 164.3xx cites.
6. Landing page + README claims vs reality: no overclaiming (e.g., "FedRAMP-ready" style language).

## Output
Rubric score 1–5 per section with rationale and citations (NIST publication + section). Findings table for concrete errors. End with PASS (≥4 avg, no Critical) or FAIL.
