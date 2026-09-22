# U12 Session Report — Deployment (2026-09-22)

## Goal
Deploy the Microtunnel design tool as a static site the user can open in
Edge/Chrome, per explicit user approval ("Next step, deployment?").

## What was done
1. Added `base: './'` to `vite.config.ts` so the production bundle uses
   relative asset paths (Pages serves from `/microtunnel-design-tool/`).
   Verified `dist/index.html` references `assets/index-*.js` relatively.
2. `git init` in the project root; committed the application (dist/ ignored —
   Pages builds from source via the official Pages Actions workflow).
3. `gh auth login` via device flow — completed by the user in their browser.
4. Created public repo `bprimm06/microtunnel-design-tool`; default branch set
   to `main` (deleted obsolete `master`); added `.github/workflows/deploy.yml`;
   pushed.
5. Initial workflow run failed: environment protection rules blocked `main`.
   Corrected the Pages environment policy; reran — deployment succeeded.
   Live URL: https://bprimm06.github.io/microtunnel-design-tool/ (HTTP 200).

## Post-deploy issue found and fixed
The live smoke test showed the map area rendering an "API KEY REQUIRED /
carto.com/basemaps/apikey" watermark: CARTO's basemaps now require an API key.
Replaced both layers with keyless sources — **Esri World Imagery (satellite,
new default)** and **OSM standard streets** — keeping the same LayersControl
toggle. Also changed the hidden file inputs (`display:none`) to `sr-only`
with aria-labels so they stay visually hidden but remain addressable for
assistive tech and automated smoke tests (no UX change). Rebuilt, committed,
pushed, and confirmed the new build was serving before retesting.

## Live verification (Chromium against the public URL)
- **Page load:** OK. Header "Microtunnel Design Tool" / "ASCE 36-15 · jacking ·
  face pressure · settlement"; Leaflet map renders (zoom, layer control, scale,
  attribution); no blank screen, no error banner.
- **Map imagery:** real Esri aerial imagery, no watermark; alignment polyline
  and boring/crossing markers render.
- **Project restore:** opened a demo `.microtunnel.json` (800-ft drive,
  5 stations) on the live site. Restored: project name "Demo — Crosstimbers
  Crossing", alignment "Drive A", borings B-1 (1+50, 45.0 ft) / B-2 (6+00,
  50.0 ft), crossings "Crosstimbers St" (road, 2+50) / "Halls Bayou" (water,
  5+50).
- **Case run:** Results tab → "Base case" (2 segments) → "Run all three
  engines". All three engines rendered numbers/tables, no error banner:
  - Jacking (U7): Max base 3,035.6 kips, Max high 4,543.6 kips, governing
    8+00, status OK; pushback 19.7 kips; self-checks 16/16.
  - Face (U8): governing target 1,238 psf @ 7+00; per-station table OK;
    self-checks 12/12.
  - Settlement (U9): status "INPUT REQUIRED" — the engine's legitimate check
    (VL% 1% below geometric overcut annulus 20.99%, likely unconservative);
    self-checks 14/14. Not a failure.
- **Errors:** none.

## Deltas / notes
- The demo project file used synthetic-but-structurally-valid inputs for smoke
  testing only; it is not validated design data (no hand-calc countersign).
- User hand-calc countersigns for REF-01, FP-01, ST-01 remain pending (U7/U8/U9).
- GitHub CLI remains authenticated on this workspace; the user was promised
  the token would be wiped when deployment work is done — honored separately
  at U12 close.
