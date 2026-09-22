# U10 Spec — Results Integration (wire U7/U8/U9 engines)

## Goal
Calculation cases in the Results panel: a named case built from the profile,
editable engine inputs, one click to run the jacking (U7), face-pressure (U8),
and settlement (U9) engines, and results displayed with units, statuses,
warnings, and assumptions. No calculation runs with incomplete required inputs.

## Design decisions
- **Case model** (`src/cases/types.ts`): `CalcCase {id, name, createdAt,
  profileFingerprint, globals, segments[], groundClasses[], kLibrary[],
  receptors[]}`. `globals` holds pipe/cutter OD, face/target basis,
  restart & face multipliers, capacities, IJS, pushback restraint,
  warn utilization, blowout factor (heuristic, disclosed), MTBM limits,
  volume loss, settlement limit, slope limit, marginal factor.
- **Segments** are the shared drive subdivision: `{startFt, endFt, groundCls,
  gammaPcf, k0, ka?, gwAboveAxisFt, frictionMode, coverFt (auto = min cover in
  range, editable), f/tabulated overrides, arching/buoyant params, curveFactor,
  include}`. Face-pressure stations are auto-derived from profile stations in
  the case range (cover from profile, soil from containing segment).
- **Case creation** (`buildCaseFromProfile`): single segment spanning the
  profile, cover = min cover in range, pipe/cutter OD pre-filled from the
  profile pipe OD (cutter = pipe OD, neutral), borings auto-added as
  receptors. Ground-class and K libraries start EMPTY — tabulated friction
  and K are project geotechnical inputs; the engines report INPUT REQUIRED
  until provided. Nothing invented.
- **Stale detection:** `profileFingerprint` = JSON of profile pipe OD +
  control points + station count. Banner when the live profile differs.
- **Execution** (`runCase`, pure): validates required inputs first
  (≥1 included segment, positive ODs, finite gamma/k0/cover per included
  segment; ka when faceBasis = 'active') → throws `CaseError` with named
  codes (`NO_SEGMENTS`, `MISSING_REQUIRED`). Then maps to the three engine
  input shapes and calls `computeJackingForce` / `computeFacePressures` /
  `computeSettlement`. Results are computed on demand, not stored.
- **UI** (`ResultsTab`): case list + "New case from profile" + delete
  (confirm); case editor (globals form, segment table with auto-split into N,
  library editors, receptor table); Run; results sections per engine:
  - Jacking: max low/base/high kips, governing station, capacity utilization
    table, IJS screening, pushback check, warnings.
  - Face: governing target psf @ station, per-station table (min stable,
    target, blowout guard, status), MTBM range note, warnings.
  - Settlement: max settlement in, governing segment, receptor table
    (settlement, ratio, status), transverse trough SVG at governing segment,
    warnings.
  - Assumptions block per case (cover = min-in-segment, libraries are
    project input, blowout guard heuristic TODO(source needed)).
- Every number carries its unit. Statuses use engine RowStatus values.
- Report export is a later unit; not in scope.

## Implementation details
- `src/cases/types.ts` — CalcCase, CaseSegment, CaseGlobals, CaseError.
- `src/cases/buildCase.ts` — `profileFingerprint`, `buildCaseFromProfile`.
- `src/cases/runCase.ts` — `validateCase`, `runCase` → `{jacking, face, settlement}`.
- `src/cases/cases.test.ts` — hand-checkable integration: face target
  840 psf on the U4b reference profile (γ=120 pcf, cover 14 ft, K0=0.5,
  no GW); structural assertions (high ≥ base ≥ low, governing station).
- `src/components/ResultsTab.tsx` — list, editor, results.
- `ProjectContext` — `cases`, `selectedCaseId`; ADD/UPDATE/DELETE_CASE,
  SELECT_CASE. Clearing the alignment clears cases.
- `RightPanel` — ResultsTab replaces the Results empty state (engine status
  list retained above it).

## Dependencies
- None (engines exist).

## Completion checklist
- [x] New case builds from profile with sane defaults and empty libraries
- [x] Validation blocks runs with missing required inputs (named errors)
- [x] All three engines run; results render with units, statuses, warnings
- [x] Segment auto-split, per-segment cover auto-fill from profile
- [x] Receptors auto-added from borings; trough chart renders
- [x] Stale-profile banner appears after profile rebuild
- [x] Integration test with hand-checkable face target passes
- [x] `npm run build`, `tsc --noEmit`, `eslint`, `vitest run` green
- [x] progress-tracker.md updated (U10 done)

## Verification evidence (2026-09-22)
- `npx vitest run`: 9 files, 83/83 tests pass (5 new in `src/cases/cases.test.ts`).
- Face hand-check on the U4b reference profile: target 1020 psf, min-stable
  673.2 psf, blowout guard 2040 psf — all match hand calc (axis 17 ft,
  σ'v = 120×17 = 2040 psf, K0 = 0.5, Ka = 0.33, no GW).
- `npx tsc --noEmit`: clean. `npx eslint src`: clean. `npm run build`: succeeds.
- Two issues found and fixed during development: `ProfileInput` uses
  `controlPoints` (not `controls`); the face engine requires Ka on every
  station (min-stable uses it), so case validation requires Ka per segment
  regardless of face basis.
