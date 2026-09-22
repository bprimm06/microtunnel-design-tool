# Architecture — Microtunnel Design Tool

## Proposed stack (defaults — change only with a recorded decision)
TypeScript (strict) · React + Vite · Leaflet via react-leaflet · Turf.js (geodesic ops) ·
Tailwind CSS · Vitest · ESLint + Prettier. Projects persist as versioned JSON
(localStorage/IndexedDB). Deployed as a static web app.

## Layers (inner → outer; dependencies point inward only)
1. **I/O** (`src/io/`) — KMZ unzip + KML parse. Points → candidate borings/waypoints;
   LineStrings → alignment geometry. Extracts lon/lat/altitude.
2. **Geospatial core** (`src/geo/`) — stationing (chainage), profile builder
   (ground surface vs. tunnel invert), interpolation, corridor buffering.
3. **Geotech** (`src/geotech/`) — borings, strata assignment, boring depth rule.
4. **Crossings** (`src/osm/`) — Overpass API queries along the corridor, classification
   (road / rail / waterway / building / utility), station referencing.
5. **Calc engine** (`src/engine/`) — pure modules: `jacking/`, `face-pressure/`,
   `settlement/`. ASCE 36-15 basis.
6. **UI** (`src/ui/`) — map workspace, profile view, results panels.
7. **Export** (`src/export/`) — calc summary/report generation.

## Data model (v1)
Project → Alignment(s) → Stations {chainage, lat, lon, groundElevFt, invertElevFt,
depthFt/coverFt} → Borings {lat, lon, depthFt, strata[]} → Crossings {type, station,
offsetFt} → CalcCases {inputs} → Results {values, assumptions, warnings}.

## Invariants — never break these
- **Calc engine is pure.** `(inputs) → (results)`. No Leaflet, DOM, or network imports
  inside `src/engine/`. Every constant traces to an ASCE 36-15 section or a named,
  user-visible assumption.
- **Units: US customary, feet.** Pressures in psf/psi, always labeled. Conversions happen
  only at import/export boundaries — never mid-calculation.
- **CRS: WGS84 lat/lon internally.** Web Mercator for display only. Distances via
  geodesic math (Turf), never planar degrees.
- **Google Earth elevations are approximate.** Any GE-derived elevation is flagged
  "GE-derived — field verify" wherever displayed or used.
- **Boring depth rule:** default termination = tunnel invert depth at the boring's
  projected station **+ 20 ft** (minimum). User may override; the tool never silently
  changes a depth.
- **No calc runs on incomplete inputs.** The engine validates and returns named errors
  (e.g. `MISSING_INVERT`, `NO_STRATA_AT_STATION`) instead of guessing.
- One unit at a time; specs before code (see `ai-workflow-rules.md`).
