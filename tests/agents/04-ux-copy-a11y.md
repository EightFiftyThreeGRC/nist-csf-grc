# Agent 4 — UX, Copy & Accessibility (model: sonnet, browser on local server)

Goal: the app reads well and is usable; landing page matches the product.

## Checklist
1. Landing page: hero claims, framework chips, and feature cards must describe features that actually exist in app.html (cross-check Framework alignment tab and workspaces). No references to removed features (walkthrough videos, Control Assessment tab).
2. Empty states: every tab pre-setup shows guidance, never a blank panel or JS error.
3. Copy pass: scan visible UI strings for typos, lorem/test junk, inconsistent casing of product terms (SSP vs Ssp, POA&M), and em-dash/emoji overload in professional surfaces (Print Report output especially).
4. A11y basics: one h1 per view; form inputs have labels/placeholders; modals trap focus and close on Esc; interactive elements are buttons/links, not bare divs; color contrast on status chips ≥ WCAG AA (spot-check amber/teal on white).
5. Responsive: at 900px and 380px widths, sidebar and wizard remain usable (single breakpoint lives in css/app.css).
6. Print Report: renders a clean, paginated report with no cut-off panels.

## Output
Findings table: Severity | Screen | Issue | Evidence (screenshot ref) | Suggested copy/fix. End with PASS/FAIL (FAIL if any Critical/High).
