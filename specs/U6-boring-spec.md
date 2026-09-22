# U6 Spec — Boring Placement (+20 ft depth rule)

## Goal
Click-to-place borings on the map, each projected to its nearest alignment
station, with default depth = tunnel invert depth at the projected station
+ 20 ft (minimum), user-overridable with the derivation preserved. Borings
appear on the map (amber), in the Borings tab (list + editor), and as sticks
on the profile chart with the +20 ft rule as a dashed line.

## Design decisions
- **Placement:** "Place borings" toggle in the Borings tab (and map hint);
  map clicks place while active; Esc or toggle exits. Requires an alignment;
  without a profile the depth is manual-only with an explanatory note.
- **Projection** (`src/geotech/borings.ts`, pure): Turf `nearestPointOnLine`
  (meters → ft via exact 3.28084) gives `stationFt` (along-line distance) and
  `offsetFt` (transverse distance). `depthToInvertFt` at the projected station
  by linear interpolation between profile stations.
- **Depth rule:** `defaultDepth = depthToInvertFt + 20`. Stored per boring:
  `depthFt`, `depthSource: 'rule' | 'override' | 'manual'`, and
  `depthDerivation` (e.g. "invert depth 34.2 ft + 20 ft = 54.2 ft @ 12+50").
  The tool never silently changes a depth: overriding sets source `override`
  and keeps the original derivation; "Reset to rule" restores it. If the
  profile is rebuilt, rule-based borings recompute (derivation updated);
  overridden/manual ones are left untouched and flagged if the station's
  depth changed (warning).
- **Boring type** (`src/geotech/types.ts`): `{id, name, lat, lon, stationFt,
  offsetFt, groundElevFt?, depthFt, depthSource, depthDerivation, strata[]}`.
  `Stratum {topDepthFt, bottomDepthFt, description}`. Auto-names B-1, B-2…
- **Strata:** lightweight editor (top/bottom/description rows). Validated on
  save: finite numbers, 0 ≤ top < bottom ≤ depth, sorted, no overlaps —
  named `BoringError` (`INVALID_STRATA`, plus `NO_ALIGNMENT`, `NO_PROFILE`
  where relevant). Full engine-facing strata assignment comes later.
- **KMZ waypoints:** Borings tab lists imported waypoints with a convert
  button → boring at the waypoint location (then projected + rule depth).
- **Map:** amber CircleMarkers (`#d97706`) with name tooltips; click selects;
  selected gets the 3px outline (ui-context). Layer toggle respected.
- **Profile chart:** boring sticks (vertical, amber) from ground to
  termination at projected station; the +20 ft rule as a dashed line at
  `invert − 20 ft` elevation. Legend extended.
- **Destructive actions confirm** (delete boring) per ui-context.

## Implementation details
- `src/geotech/types.ts` — Boring, Stratum, BoringError.
- `src/geotech/borings.ts` — `projectToAlignment(lat, lon, stations)`,
  `depthToInvertAt(stationFt, profileStations)`, `defaultBoringDepth(...)`,
  `validateStrata(strata, depthFt)`, `nextBoringName(existing)`.
- `src/geotech/borings.test.ts` — projection on a known straight alignment
  (station + offset), depth interpolation, derivation string, strata
  validation cases, no-profile behavior.
- `src/components/BoringsTab.tsx` — placement toggle, list, editor
  (name/depth/override/reset/strata), waypoint conversion, delete confirm.
- `src/components/BoringMarkers.tsx` — map markers + selection.
- `MapViewer.tsx` — wire click-to-place via `placingBoring` context flag.
- `ProfileChart.tsx` — sticks + dashed rule line props.
- `ProjectContext` — `borings`, `placingBoring`, `selectedBoringId`;
  actions ADD/UPDATE/DELETE_BORING, SET_PLACING, SELECT_BORING;
  SET_PROFILE recomputes rule-based boring depths.

## Dependencies
- None (Turf already installed).

## Completion checklist
- [x] Click places boring at the right station/offset (test + dev check)
- [x] Rule depth = invert depth + 20 ft with derivation shown; override + reset work
- [x] Profile rebuild recomputes rule borings, preserves overrides (flagged)
- [x] Strata validation rejects overlaps/gaps-out-of-range with named errors
- [x] Map markers, selection outline, layer toggle; sticks + dashed rule on chart
- [x] Waypoint → boring conversion works
- [x] `npm run build`, `tsc --noEmit`, `eslint`, `vitest run` green
- [x] progress-tracker.md updated (U6 done)

## Verification evidence (2026-09-22)
- `npx vitest run`: 8 files, 78/78 tests pass (12 new in `src/geotech/borings.test.ts`).
- `npx tsc --noEmit`: clean. `npx eslint src`: clean. `npm run build`: succeeds.
- One test failure found and fixed during development: projection returned
  raw Turf geodesic distance instead of interpolating the stations'
  `chainageFt`; fixed by segment-based chainage interpolation so projection
  always agrees with the station table.
