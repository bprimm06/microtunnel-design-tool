# U0 Audit Report — Microtunnel_Jacking_Load_Tool_v2.0_1.html

**Date:** 2026-09-22 · **Method:** static review (not yet run in browser)
**File:** `source/Microtunnel_Jacking_Load_Tool_v2.0_1.html` (272 KB, single-file, no external libs)

## What it is
"Microtunnel Jacking & Settlement Platform v2.0" — a self-contained calculation
workbench. No map, no imports; stations/segments are entered manually.

## What works — keep / port
- **Jacking engine (`mtCompute`)**: segment-based drive model; ground-class friction
  library with low/base/high values and per-segment overrides; face resistance =
  (horizontal effective stress + water pressure) × face area; skin friction =
  f × π × OD × length × curve factor; restart/initiation forces (low/base/high);
  utilization vs. allowable; per-segment status (OK / REVIEW / ERROR / INPUT REQUIRED);
  warnings channel. Well-structured.
- **Settlement engine (`settleCompute`, `settleTroughAt`, `settleSlopeAt`)**:
  Gaussian/Peck trough, volume-loss input, trough-width K, settlement + slope limits,
  receptors.
- **Drive profile model**: launch station/invert, grade, ground surface; cover pulled
  from the profile per segment.
- **Supporting systems**: station/chainage parse+format, hand-rolled canvas charts
  (profile, envelope, longitudinal), results tables, insights generator, MTBM database,
  and a governance workflow — every calc basis is explicitly marked PROVISIONAL,
  i.e. the tool was built expecting exactly the verification step we're doing now.

## What's missing vs. the target tool
1. **No ASCE 36-15 traceability** — zero references in the file. The gap the user flagged.
2. **Face pressure is a mention, not a module** (1 occurrence) — needs a real
   face/support pressure calculation.
3. **No geospatial layer at all** — no Leaflet, no KMZ/KML import, no OSM crossings,
   no boring placement. ("Boring" appears only in disclaimer text.)
4. Stations/cover are manual inputs — nothing derives them from real geometry.

## Verdict
**Don't rewrite — port and verify.** The jacking + settlement structure is a solid
reference implementation. Plan:
1. Verify/port the engine against ASCE 36-15 (PDF now in `source/`) → flips the
   PROVISIONAL calc basis to VERIFIED, section by section.
2. Build the new geospatial shell around it: KMZ/KML import → Leaflet map → OSM
   crossings → boring placement with auto-depth — feeding the engine.
3. Add the face pressure module (new, per ASCE 36-15).
4. Engine ports into `src/engine/` as pure modules; the HTML stays as reference.

## Next
U7 (jacking engine verification vs. ASCE 36-15) is unblocked — the standard is local.
Needs: read ASCE 36-15 jacking/face-pressure/settlement sections, map each equation to
the existing `mtCompute`/`settleCompute` logic, record deltas.
