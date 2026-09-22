# U11 Spec — Report export

## Goal
One-click export of a calculation summary for the selected case: project/case
metadata, inputs, results, warnings, and assumptions — as a self-contained,
print-friendly HTML file the engineer can save, print to PDF, or attach to a
design package.

## Design decisions
- **Format:** single self-contained HTML file (inline CSS, no external deps),
  print stylesheet included. Named
  `microtunnel-report-<case-slug>-<yyyymmdd>.html`.
- **Pure builder** (`src/report/buildReport.ts`): `(input: ReportInput) => string`.
  All user strings HTML-escaped. Tested with synthetic results — no DOM in tests.
- **Download** is a thin DOM helper next to the button (`Blob` + anchor click).
- **ReportInput** assembled in `ResultsTab` from state: project name, case, last
  run results, profile summary, borings, crossings.
- **Sections:**
  1. Header — title, project, case, generated timestamp, profile-fingerprint note
  2. Drive summary — length, station range, pipe/cutter OD
  3. Inputs — globals table; per-segment table (soil, cover, friction mode +
     key params); face stations; receptors
  4. Results — jacking (max low/base/high, governing station, capacities,
     utilization, IJS screening, pushback); face (per-station table + governing
     target); settlement (receptor table + governing trough summary)
  5. Warnings — engine warnings grouped by engine
  6. Borings appendix — station, offset, depth, strata
  7. Crossings appendix — kind, name, station
  8. Assumptions — the shared `REPORT_ASSUMPTIONS` list (moved to
     `src/cases/assumptions.ts`, ResultsTab imports it)
  9. Disclaimers — GE/OSM "field verify", blowout heuristic TODO(source needed),
     "independent hand-check countersign pending" for REF-01/FP-01/ST-01
- **Availability:** button in ResultsTab, enabled only when results exist and
  inputs are not stale. Disabled state explains why.
- Number formatting: `formatStation` for stations; fixed decimals elsewhere
  (kips 0, psf 0, in 2, ft 1).

## Out of scope
- PDF generation in-app (browser print-to-PDF covers it).
- Multi-case or whole-project reports (one case per report).
- Charts/images in the report (tables only; trough summarized numerically).

## Completion checklist
- [x] `REPORT_ASSUMPTIONS` shared between ResultsTab and the report
- [x] Pure HTML builder with escaping; all nine sections render
- [x] Tables show real values from a synthetic CaseResults in tests
- [x] Export button enabled only on fresh results; downloads a file
- [x] `npm run build`, `tsc --noEmit`, `eslint`, `vitest run` green
- [x] progress-tracker.md updated (U11 done)
