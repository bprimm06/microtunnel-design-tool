# Progress Tracker — Microtunnel Design Tool

> The ONLY dynamic context file. Update at unit start and unit end. This is the
> project's memory between sessions.

## Status: context drafted — 2026-09-22
Six context files + project AGENTS.md written. Build has not started.

**Update 2026-09-22:** User has an existing self-built HTML version of the tool (engine
math predates ASCE 36-15 access) and now has ASCE 36-15. Revised plan: **U0 — audit the
existing HTML** (keep working import/map/UI, rebuild engine against ASCE 36-15) before
any new scaffolding. Awaiting the HTML file from the user.
- [x] **U0 — Audit existing HTML.** Done 2026-09-22. Report: `audit/U0-audit-report.md`.
  Verdict: keep the jacking + settlement calc core as reference implementation; verify
  against ASCE 36-15 (PDF in `source/`); build new geospatial shell (KMZ/KML → Leaflet →
  OSM crossings → borings) around it; add face pressure module. Static review only —
  not yet run in browser.

## Units (in build order)
- [x] **U1 — Project setup:** repo scaffold done 2026-09-22 per
  `specs/U1-U4-app-shell-spec.md` (React 19 + Vite + TS 5.x strict, Tailwind v4,
  Vitest, ESLint/Prettier). `npm run build` succeeds; `test` green (42/42 engines).
  Note: TypeScript pinned to ^5.9 — TS 7 breaks typescript-eslint peer range.
- [ ] **U2 — Data model:** Project/Alignment/Station/Boring/Crossing/CalcCase/Result
      types + validation. Done when invalid inputs are rejected with named errors.
- [x] **U3 — KMZ/KML import:** done 2026-09-22 per `specs/U3-kmz-import-spec.md`.
  jszip + fast-xml-parser; KML parse (nested folders, MultiGeometry), KMZ unzip
  (doc.kml preferred), stationing via Turf geodesic + 25 ft densification,
  altitudes m→ft flagged `ge`. Longest LineString = active alignment. Typed
  ImportError codes. Sample KMZ (built in-test) matches independent haversine
  within 0.5%. 59/59 tests green; build succeeds.
- [x] **U4 — Leaflet map viewer (shell + alignment):** done 2026-09-22. Map
  renders with CartoDB Positron light/dark base layers, layer toggles wired to
  state, scale control, empty states per ui-context.md. Imported alignment
  renders as indigo polyline with start/end station tooltips; map fitBounds on
  import. Project tree shows name, length, station count, waypoint list, import
  notes, and the GE badge.
- [x] **U4b — Profile builder:** done 2026-09-22 per `specs/U5-profile-spec.md`.
  `src/geo/profile.ts` (pure): invert from control points (linear interp, flat
  clamp beyond), crown = invert + OD, cover = ground − crown, depth = ground −
  invert. Named ProfileError codes; warnings for clamped/negative/shallow
  (<1 OD, heuristic)/missing-ground. Hand-calc reference passes (7 tests).
  Profile tab: control-point editor + constant-grade fill (preserves HTML
  tool's inv0+grade approach), SVG chainage-elevation chart, station table,
  inputs → values → assumptions → warnings. 66/66 tests green; build succeeds.
- [x] **U5 — OSM crossings:** done 2026-09-22 per `specs/U5-crossings-spec.md`.
  Overpass corridor query (GET, 150 ft default half-width, user-settable), road/rail/
  water/building/utility classification, station referencing via Turf intersection +
  projectToAlignment, 100 ft dedupe window, map markers behind the crossings layer
  toggle, Crossings tab list. 10 osm tests green; live Overpass smoke test returned
  HTTP 200 with 97 highway elements in a realistic corridor. OSM-derived — field verify.
- [x] **U10 — Results integration:** done 2026-09-22 per `specs/U10-results-spec.md`.
  Calculation cases built from the profile: named cases with globals, drive
  segments (auto-split, cover = min-in-segment auto-fill), capacity table,
  friction + trough-K libraries (start empty — project geotechnical input),
  receptors (auto-added from borings). `runCase` validates required inputs
  (named CaseError) then maps to `computeJackingForce`/`computeFacePressures`/
  `computeSettlement`. Results panel shows jacking bands + utilization + IJS +
  pushback, face-pressure windows per station, settlement + receptor table +
  trough chart, warnings, and an assumptions block. Stale-profile and
  inputs-changed banners. Integration test hand-checks face target 1020 psf
  on the U4b reference profile. 83/83 tests green; build succeeds.
- [x] **U6 — Boring placement:** done 2026-09-22 per `specs/U6-boring-spec.md`.
  Click-to-place (Esc exits), projection to station/offset via Turf, +20 ft
  rule depth with derivation, user override + reset, profile rebuild
  recomputes rule borings and flags drifted overrides, strata editor with
  validation, KMZ waypoint conversion, amber map markers, boring sticks and
  dashed +20 ft rule line on the profile chart.
      (min), override allowed. Done when depth fills correctly and derivation shows.
- [x] **U7 — Jacking force engine (ASCE 36-15):** verification report done 2026-09-22
  (`audit/U7-jacking-verification-report.md`). Structure matches (JF = FP + ΣFR);
  implementation done 2026-09-22 per `specs/U7-jacking-engine-spec.md`:
  `src/engine/jacking/` (types, engine, reference case, 16 Vitest tests — all green;
  expected values from independent Python implementation `scripts/gen_reference.py`).
  PENDING: user hand-calc countersign of REF-01 before U7 is fully closed.
  4 deltas/gaps to fix in implementation: arching-based σ'n, buoyant-weight fallback
  for hard clay/rock, pushback/brake check, K0-vs-active face basis. Implementation +
  hand-calc test still open.
- [x] **U8 — Face pressure engine:** pure module done 2026-09-22 per `specs/U8-face-pressure-spec.md`:
  `src/engine/face-pressure/` (types, engine, FP-01 reference, 12 Vitest tests — all green;
  expected values from independent Python `scripts/gen_face_reference.py`).
  Shared soil-stress helpers moved to `src/engine/common/soil-stress.ts`; U7 refactored to
  import them (28/28 tests still green). Blowout guard is a disclosed heuristic, TODO(source needed).
  PENDING: user hand-calc countersign of FP-01 before U8 is fully closed.
- [x] **U9 — Settlement engine (Peck trough, ASCE 36-15 §13.5):** pure module done 2026-09-22
  per `specs/U9-settlement-spec.md`: `src/engine/settlement/` (types, engine, ST-01
  reference, 14 Vitest tests — all green; 42/42 across U7/U8/U9). Expected values from
  independent Python `scripts/gen_settlement_reference.py`. Reference HTML's
  self-verification identities (volume conservation, S(i)/Smax = e^-0.5, slope peak)
  ported as tests. New check: warns when VL% < geometric overcut annulus.
  PENDING: user hand-calc countersign of ST-01 before U9 is fully closed.
- [x] **U11 — Report export:** done 2026-09-22 per `specs/U11-report-spec.md`.
  One-click self-contained print-friendly HTML report per case: drive summary, globals
  + segment inputs, jacking/face/settlement results tables, engine warnings, borings
  and crossings appendices, shared assumptions list, field-verify disclaimers.
  Button enabled only on fresh results. 4 report tests green; end-to-end HTML
  validated (balanced tags, real values). 97/97 tests total.
- [x] **U12 — Deployment:** done 2026-09-22. Static site live at
  https://bprimm06.github.io/microtunnel-design-tool/ (GitHub Pages, public
  repo `bprimm06/microtunnel-design-tool`, branch `main`; `base: './'` for
  subpath-safe asset paths). Live smoke test passed: page loads, Leaflet map
  renders, demo `.microtunnel.json` project opened on the live site
  (alignment Drive A, borings B-1/B-2, 2 crossings restored), Base case ran —
  jacking (max base 3,035.6 kips, 16/16 self-checks), face (governing target
  1,238 psf @7+00, 12/12), settlement rendered with INPUT REQUIRED status
  (VL% 1% below geometric overcut annulus 20.99% — engine's legitimate check,
  14/14 self-checks). Post-deploy fix: CARTO basemaps now need an API key →
  replaced with Esri satellite (default) + OSM streets; hidden file inputs
  changed to sr-only for a11y/automation. Session report: `audit/U12-session-report.md`.
  Note: `gh` CLI auth token still present on the workspace at U12 close —
  promised the user it would be wiped; do it before any further network work.
- [x] **U13 — Project file save/open:** done 2026-09-22 per `specs/U13-project-file-spec.md`.
  One JSON file (`.microtunnel.json`, schema v1) holding all durable state: project
  name, alignment, waypoints, import warnings, profile, borings, cases, crossings.
  Save/Open in the left-rail Project section; opening over a non-empty project asks
  for confirmation; typed errors (INVALID_JSON / UNSUPPORTED_VERSION / INVALID_SCHEMA).
  Nothing is stored automatically. 6 project-file tests green. 103/103 tests total.
- [x] **U14 — Autosave to user-chosen file:** done 2026-09-22 per
  `specs/U14-autosave-spec.md`. File System Access API: first Save asks where to
  put the `.microtunnel.json` file; the handle persists in IndexedDB and project
  changes autosave (1.5 s debounce) with status in the rail ("Autosaved …" /
  "Saving…" / error + Retry). Save as…, Open (autosave follows the opened file),
  Unlink, and a Reconnect flow for re-approval after reload. Browsers without
  the API (Safari/Firefox/iOS) fall back to download-a-copy saves and the file
  input. 3 file-system tests green. 106/106 tests total.

## Architecture decisions
- 2026-09-22: Stack defaulted to React + Vite + TS strict + Leaflet + Turf.js +
  Tailwind + Vitest (change only with a recorded decision here).
- 2026-09-22: Calc engine = pure functions, ASCE 36-15 sourced; feet/WGS84 internal.

## Open questions
- Confirm stack defaults (or name alternatives) before U1 spec.
- Reference hand-calc cases needed for U7/U8/U9 (user to supply or approve generated).
- OSM data source: Overpass API default — ok, or local extract preferred?
