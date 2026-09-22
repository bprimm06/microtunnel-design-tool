# U3 Spec — KMZ/KML Import + Stationing

## Goal
Import Google Earth KMZ/KML: parse points and LineStrings, extract WGS84
lon/lat/altitude, build a chainaged station table along the alignment, and render
the alignment on the map. Done when a sample KMZ produces a correct station table
(verified by tests against an independent haversine reference).

## Design decisions
- **Parsing:** `fast-xml-parser` (works in Vitest/node — no DOM dependency).
  Recursive Placemark collection through Document/Folder nesting; handles Point,
  LineString, MultiGeometry. `gx:Track` not supported (warning issued).
- **Unzip:** `jszip`. Detects KMZ by `PK` magic bytes or `.kmz` extension;
  plain `.kml` parses directly. Prefers `doc.kml`, else first `.kml` in archive.
- **Multiple LineStrings:** each becomes an alignment candidate; the **longest**
  is loaded as the active alignment, others are reported as warnings.
- **Points:** extracted as candidate waypoints/borings (`waypoints`), stored in
  state; actual boring creation is U6.
- **Stationing** (`src/geo/stationing.ts`, pure): cumulative geodesic distance
  via Turf (`distance`, meters → ft with the exact 3.28084 factor), chainage 0
  at the first vertex. Vertices are densified to a fixed interval —
  **default 25 ft** — using Turf `along`, so profiles and later calc stations
  are evenly spaced.
- **Elevations:** KML altitude is meters → feet. Every imported elevation gets
  `elevSource: 'ge'` and the UI shows the "GE-derived — field verify" badge.
  Vertices without altitude: elevation linearly interpolated between the nearest
  valued neighbors; stations beyond valued range get `undefined` + a warning.
  (GE altitudeMode semantics are not interpreted — recorded as a limitation.)
- **Errors:** typed `ImportError` with codes: `NOT_KMZ_OR_KML`,
  `NO_KML_IN_ARCHIVE`, `KML_PARSE_ERROR`, `NO_LINESTRING`,
  `EMPTY_LINESTRING`, `INVALID_COORDINATE`.
- **UI wiring:** LeftRail import button enabled → file picker (`.kmz,.kml`) →
  result stored in ProjectContext (`alignment`, `waypoints`). MapViewer renders
  the alignment Polyline (indigo `#4f46e5`) with start/end station tooltips and
  `fitBounds`. Project tree shows alignment name, length, station count.
  This completes U4's original done-criteria (alignment rendered, toggles work).

## Types (first slice of the U2 data model)
`src/geo/types.ts`: `ElevSource`, `GeoPoint {lat, lon, elevFt?, elevSource?}`,
`Station {chainageFt, lat, lon, groundElevFt?, elevSource?}`,
`AlignmentGeometry {name, stations, lengthFt, source}`,
`KmlWaypoint {name, lat, lon, elevFt?, elevSource?}`,
`ImportResult {alignments, waypoints, warnings}`.

## Implementation details
- `src/io/kml.ts` — `parseKml(xml: string): ParsedKml` (placemark walk, coordinate
  tuple parsing with validation).
- `src/io/kmz.ts` — `importFile(data: ArrayBuffer, filename: string):
  Promise<ImportResult>`; `ImportError` class.
- `src/io/kml.test.ts`, `src/io/kmz.test.ts` — KMZ built in-memory with jszip
  in the test (no binary fixtures).
- `src/geo/stationing.ts` — `buildStations(vertices, intervalFt = 25)`,
  `buildAlignment(name, vertices, source)`.
- `src/geo/stationing.test.ts` — independent haversine reference in the test
  (not Turf) for chainage; elevation interpolation; empty/invalid inputs.
- ProjectContext: `alignment: AlignmentGeometry | null`, `waypoints:
  KmlWaypoint[]`, `SET_IMPORT_RESULT` action, `importError: string | null`.

## Dependencies
- npm: `jszip`, `@types/jszip`, `fast-xml-parser`.

## Completion checklist
- [x] Sample KMZ (built in-test) → station table matches independent haversine
      within 0.5%
- [x] Elevations converted m→ft, flagged `ge`, badge shown in project tree
- [x] Named ImportError codes for corrupt/empty/missing-geometry inputs
- [x] `npm run build`, `tsc --noEmit`, `vitest run` green (59/59)
- [x] Alignment renders on the map in dev; import button + file picker wired
- [x] progress-tracker.md updated (U3 done; U4 fully done)
