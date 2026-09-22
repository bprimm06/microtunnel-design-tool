# U4b Spec — Profile Builder (invert, cover, depth per station)

> Numbered U4b in the tracker (inserted between U4 and U5); file keeps the
> U5 working title from drafting.

## Goal
Build the tunnel vertical alignment from user-defined control points and
compute per-station invert elevation, crown elevation, cover, and depth to
invert. Render the profile (ground vs. invert) in the Profile tab with a
station table. Done when a hand-calculated reference case passes and the
Profile tab shows the chart + table.

## Design decisions
- **Invert definition:** control points `{stationFt, invertElevFt}`, linearly
  interpolated between points. This generalizes the HTML tool's
  `invert = inv0 + grade·(s−s0)/100` (two control points = constant grade).
  UI offers a "constant grade" quick-fill (start invert + grade %) that
  generates the two control points — preserving the existing tool's approach.
- **Beyond outer control points:** invert is held flat (clamped) with a warning,
  not extrapolated — safer than inventing grade beyond the designer's intent.
- **Pure engine** (`src/geo/profile.ts`): `(stations, input) → {profile, warnings}`.
  No Leaflet/DOM. Errors thrown as `ProfileError` with codes:
  `NO_CONTROL_POINTS`, `DUPLICATE_CONTROL_STATION`, `CONTROL_NOT_SORTED`
  (auto-sort instead? no — reject, the designer orders them),
  `INVALID_PIPE_OD`, `NO_STATIONS`.
- **Per-station outputs:** `invertElevFt`, `crownElevFt = invert + pipeODFt`,
  `coverFt = ground − crown`, `depthToInvertFt = ground − invert`.
  Stations lacking ground elevation get `undefined` cover/depth + a warning
  (no guessing — architecture invariant).
- **Warnings (not errors):** `NEGATIVE_COVER` (lists worst station — daylighting),
  `SHALLOW_COVER` (cover < 1.0×OD — flagged as a project-assumption heuristic,
  `TODO(source needed)` if no ASCE basis is found), `CLAMPED_CONTROL_POINT`
  (control outside the station range).
- **Types** extend `src/geo/types.ts`: `ProfileControlPoint`,
  `ProfileInput {controlPoints, pipeODFt}`, `ProfileStation extends Station`,
  `ProfileWarning {code, message, stationFt?}`.
- **UI:** RightPanel Profile tab —
  1. no alignment → empty state;
  2. alignment, no profile → control-point editor (editable station/invert rows,
     add/remove, pipe OD input, constant-grade quick fill, Build button);
  3. profile → SVG chainage-vs-elevation chart (ground line, invert line in
     indigo, cover fill between), station table (station / ground / invert /
     cover / depth, all with units), inputs → values → assumptions → warnings
     block per ui-context.md. GE badge wherever ground elevations show.
  Edit flow: "Edit" returns to the editor with inputs pre-filled; rebuild on
  Build. Clearing the alignment clears the profile.
- **State:** ProjectContext gains `profileInput`, `profile` (stations +
  warnings), actions `SET_PROFILE`, `CLEAR_PROFILE` (also on alignment clear).

## Implementation details
- `src/geo/profile.ts` — `buildProfile(stations, input)`, `ProfileError`.
- `src/geo/profile.test.ts` — hand-calculated reference: 5-station alignment,
  2 control points, OD 6 ft; expected inverts/covers computed by hand in the
  test comments. Plus: single control point (flat), clamping warning,
  negative-cover warning, duplicate/out-of-order rejection, missing ground
  elevation handling.
- `src/components/ProfileTab.tsx` — editor + chart + table.
- `src/components/ProfileChart.tsx` — SVG chart (viewBox, responsive).
- RightPanel renders ProfileTab in the Profile tab slot.

## Dependencies
- None (SVG hand-rolled; no chart library).

## Completion checklist
- [x] Hand-calc reference case passes (inverts, crowns, covers, depths)
- [x] Named ProfileError codes for invalid inputs
- [x] Clamp/negative-cover/shallow-cover/missing-ground warnings correct
- [x] Profile tab: editor → chart + table → edit round-trips
- [x] `npm run build`, `tsc --noEmit`, `eslint`, `vitest run` green (66/66)
- [x] progress-tracker.md updated (U4b done)
