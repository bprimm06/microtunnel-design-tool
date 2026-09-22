# Code Standards — Microtunnel Design Tool

## TypeScript
- `strict: true`. No `any` in `src/engine/` or `src/geo/` — engine inputs are validated
  interfaces; parse/validate at the boundary, then trust the types.
- Units live in names: `depthFt`, `pressurePsf`, `chainageFt`, `diameterIn`. A bare
  `depth` or `pressure` is a review failure.
- Pure functions are `verbNoun`: `computeJackingForce`, `stationAlignment`,
  `projectBoringToStation`.

## File organization
- `src/engine/{jacking,face-pressure,settlement}/` — one module per calc set, each with
  `*.test.ts` beside it and a `reference-cases.ts` holding hand-verified inputs/outputs.
- `src/geo/` stationing + profiles · `src/io/` KMZ/KML · `src/osm/` crossings ·
  `src/geotech/` borings/strata · `src/ui/` components · `src/export/` reports.
- No cross-layer imports that skip a level (UI never imports `src/io/` internals).

## Tests (Vitest)
- Every engine function ships with a reference-case test. Test names cite the source:
  `it('jacking force, 36-in drive, 400 ft — ASCE 36-15 §X / hand calc 2026-09-22', …)`.
- Geo tests use small synthetic alignments with exact expected chainages.
- A failing engine test blocks the unit from closing. No exceptions.

## Style
- ESLint + Prettier, no `console.log` in engine/geo code (use a `Result.warnings[]`
  channel instead).
- Magic numbers are named constants with a source comment:
  `const BORING_DEPTH_BELOW_INVERT_FT = 20; // project-overview: boring depth rule`
- Comments explain *why* and *which standard section*; the code should explain the *how*.
