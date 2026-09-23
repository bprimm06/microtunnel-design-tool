# Progress Tracker — Microtunnel Design Tool

> The ONLY dynamic context file. Update at unit start and unit end. This is the
> project's memory between sessions.

## Status: U22 done, awaiting deploy approval — 2026-09-22
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
- [x] **U15 — NWI wetlands crossing kind:** done 2026-09-22 per
  `specs/U15-wetlands-spec.md`. Detect crossings now queries the USFWS National
  Wetlands Inventory (USGS-hosted MapServer, verified live) in parallel with
  Overpass; wetland polygons become station-referenced `wetland` crossings
  (name = WETLAND_TYPE, detail = NWI code + acres, teal markers, filter
  checkbox). Partial source failure shows a warning naming the failed source
  instead of failing the whole run. Tab carries "NWI-derived — field verify"
  plus the screening-not-jurisdictional disclaimer. Old
  `www.fws.gov/wetlands/arcgis/...` endpoint is dead — do not use. 10 new
  tests green. 116/116 tests total. Live-verified on the ConEdison alignment:
  11 road crossings, 0 wetlands (correct per direct service query), no errors.
- [x] **U16 — NLD levees crossing kind:** done 2026-09-22 per
  `specs/U16-levees-spec.md`. Detect crossings now queries the USACE National
  Levee Database (ArcGIS Online FeatureServer `NLD2_PUBLIC_v1`, verified live)
  layer 10 `Embankments` (levee centerline polylines) in parallel with Overpass
  and NWI; embankments become station-referenced `levee` crossings
  (name = SEGMENT_NAME, detail = NLD system + segment ID, amber markers,
  filter checkbox). Old NLD hosts `maps.crrel.usace.army.mil` and
  `levees.sec.usace.army.mil/arcgis` are dead — do not use. Layer 16
  `Leveed_Areas` (protected-area polygons) intentionally not queried: being
  inside a leveed area is not a levee crossing. Tab carries "NLD-derived —
  field verify" plus the Section 408 note. 10 new tests green. 126/126 tests
  total. Live-verified: ConEdison corridor returns 0 embankments (true zero,
  confirmed by direct service query); Sacramento envelope returns 228 real
  embankments through the actual `fetchNLD` module.
- [x] **U17 — Ground data choice:** done 2026-09-22 per
  `specs/U17-ground-choice-spec.md`. Import-time ground-source select in the
  left rail: `KMZ altitudes (GE-derived)` (default) or `Manual entry`.
  `Station.geGroundElevFt` retains the KMZ value even when the working ground
  is overridden; manual imports keep the backup so nothing is lost. Ground is
  editable at every station in the Profile table — typed values set
  `elevSource: 'survey'`, clearing restores the KMZ value where one exists.
  `Restore GE ground` bulk-resets with a confirm dialog when survey overrides
  exist. Per-source badges (GE-derived — field verify / user-entered — verify).
  Ground now feeds `profileFingerprint`, so ground edits mark calc cases stale.
  `geGroundElevFt` round-trips through project save/open without a schema
  change. 8 new tests green, 135/135 total; ConEdison KMZ smoke-verified
  (KMZ + manual imports, edit/clear/restore semantics).
- [x] **U18 — Help menu:** done 2026-09-22 per `specs/U18-help-menu-spec.md`.
  `HelpModal` with instructions like the original HTML's "How to Use" dialog,
  rewritten for this app's workflow: what the tool does, numbered how-to steps
  (import → profile → borings → crossings → results → save/report), data-source
  & field-verify badges, and what it is not (unsealed working documents, not
  engineer-sealed deliverables). Header Help button + `?` FAB bottom-right;
  auto-opens on first visit with persistent dismissal. No changes to
  calculation, import, or save behavior.
- [x] **U19 — Ground reference in the profile editor:** done 2026-09-22 per
  `specs/U19-ground-reference-spec.md`. The invert editor now opens with a
  "Ground elevations" section: launch (0+00) and reception ground with
  per-source badges on one summary line, plus a collapsible all-stations table
  with editable ground (launch/reception rows highlighted) — so inverts are
  set against known ground. Empty-state hint when no ground exists; build is
  not blocked. Help modal step 2 documents the ground-first workflow.
  135/135 tests green; tsc/eslint/build clean. Deployed 2026-09-22 (Pages run 35806991255, live bundle verified).
- [x] **U20 — Branding, ownership & legal notice:** done 2026-09-22 per
  `specs/U20-branding-spec.md`. Brand palette from the original HTML
  (#1F4FA3/#183E85/#E8EEF8) applied across the interface (Tailwind v4
  `@theme`, all indigo → brand). Deep-blue header: "Microtunnel Design
  Tool®" + "Branako K. Primm, PE · © 2026 · v1.0.0". Footer bar with
  ownership line and a Legal notice button. Help modal gains the suggested
  legal notice; HTML report footer carries the ® mark and copyright.
  135/135 tests green; tsc/eslint/build clean. Deployed 2026-09-22 (Pages run 35806991255, live bundle verified).
- [x] **U21 — GIS ground elevations (USGS 3DEP):** done 2026-09-22 per
  `specs/U21-gis-ground-spec.md`. Diagnosed the user's 0.0 ft report: GE
  clamps drawn paths to terrain and exports altitude 0 on every vertex.
  `buildStations` now detects all-zero KMZ altitudes, assigns no ground,
  and warns (points at 3DEP fetch / surveyed entry) instead of silently
  designing to 0.0 ft. New `src/gis/elevation.ts`: EPQS point queries
  (NAVD88 feet, no key, CORS `*` — verified live), sequential per-station
  fetch with progress + partial-failure reporting. New `3dep` ElevSource,
  blue "3DEP-derived — field verify" badge (distinct from GE amber —
  different datum), `SET_STATIONS_GROUND` context action, "Fetch ground
  from 3DEP" button in the Profile tab Ground section, Help docs updated.
  148/148 tests green; tsc/eslint/build clean. Deployed 2026-09-22 (commit 7168a1c, Pages run 35808051782, live bundle verified: 3DEP fetch + clamped-ground warning).
- [x] **U22 — MTBM catalog + populated settlement assumptions:** done 2026-09-22 per
  `specs/U22-mtbm-catalog-spec.md`. New `src/mtbm/catalog.ts`: 20 preselected
  Herrenknecht AVN machines (AVN XC small 250–700, AVN XC standard 800–2000,
  AVN 2400 class, AVN TC 1200–1800) with shield/pipe OD, torque, cutter speed,
  rated power, steering, slurry-line, drive-length specs and Soft/Mixed/Hard-rock
  cutting wheels (all from archived brochure tables — verify against manufacturer
  data sheets). Selecting a machine autopopulates cutter OD, cutting wheel, and
  a spec card flagged "Catalog-derived — verify with the manufacturer data
  sheet"; manual cutter-OD edits are flagged against the catalog value; Custom /
  manual entry preserves the old workflow. New `settlementAssumptions(c, r)`:
  the Settlement results panel carries a populated Assumptions block (Peck
  Gaussian/§13.5 method, excavated area from actual cutter OD, machine + wheel,
  volume loss with segment overrides, trough K + computed i per segment with
  override/kLibrary basis, settlement/slope limits, marginal factor, cover/z0
  convention, catalog provenance) and the HTML report includes the MTBM in the
  Drive summary plus the assumptions. 157/157 tests green; tsc/eslint/build
  clean. Browser E2E verified 2026-09-22 on the dev server with a synthetic
  KMZ (25/25 checks): AVN 1200 XC → cutter OD 50.98 in, spec card values,
  wheel default Soft ground; engines ran; assumptions showed excavated area
  14.18 ft², overcut annulus 50.13%, sta 0–968 K=0.50 (override) i=43.28 ft,
  limits 1.00 in / 1:200, band 1/1.25, catalog provenance; report export
  contains the MTBM line and assumptions. Awaiting deploy approval.
