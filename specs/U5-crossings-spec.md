# U5 Spec — OSM Crossings along the corridor

## Goal
Detect OpenStreetMap features crossing the alignment — roads, railways,
waterways, buildings, utilities — via the Overpass API, classify them,
reference each to its alignment station, and show them on the map (colored
markers) and in the Crossings tab (sorted list). OSM data is labeled
"OSM-derived — field verify."

## Design decisions
- **Corridor:** Turf buffer around the alignment polyline; half-width
  user-settable (default 150 ft, labeled). Buffer polygon simplified before
  embedding in the Overpass `poly:"lat lon …"` filter.
- **Query** (`src/osm/overpass.ts`, pure builder): one QL query with
  `way(poly)[highway]`, `[railway]`, `[waterway]`, `[building]`,
  `[power=line]`, `[man_made=pipeline]`; `out geom`. Fetch is client-side
  POST to `https://overpass-api.de/api/interpreter` with a 60 s abort.
  Typed `OsmError`: `NO_ALIGNMENT`, `NETWORK`, `TIMEOUT`, `RATE_LIMITED`,
  `BAD_RESPONSE`.
- **Classification** (`src/osm/crossings.ts`, pure): road / rail / water /
  building / utility from tags; label = `name || ref || tag value`
  ("unnamed road" fallback); detail = the raw tag (e.g. `highway=motorway`).
- **Crossing math:** Turf `lineIntersect` of the OSM way geometry with the
  alignment; first intersection → `projectToAlignment` (reused from U6) for
  station/offset. Buildings are polygons: boundary intersections, else
  centroid projection; station = first boundary hit. Ways with no alignment
  intersection are dropped (they only crossed the corridor, not the drive).
- **Dedupe:** same kind + same label within 100 ft of station → single
  crossing (dual carriageways, split ways). Documented display dedupe.
- **UI** (`CrossingsTab`): corridor width input, kind toggles, Detect button
  with loading state, friendly errors with retry, list sorted by station
  (kind badge, name, station, detail). Map: colored CircleMarkers with
  tooltips (road red, rail slate, water blue, building orange, utility
  purple), behind the existing crossings layer toggle.
- **State:** `crossings: Crossing[]` in ProjectContext; SET/CLEAR actions;
  clearing the alignment clears crossings. No live-profile coupling.
- **Tests:** no network — synthetic Overpass JSON for classification,
  intersection station math, dedupe, and query-builder shape.

## Out of scope
- Auto-creating settlement receptors from buildings (noted as follow-up).
- Relation/multipolygon members beyond closed-way buildings.

## Completion checklist
- [x] Corridor polygon + QL builder produce a valid Overpass query
      (proven live: HTTP 200, 97 highway elements, realistic 150 ft corridor)
- [x] Fetch with timeout, typed errors, retry
- [x] Classification of all five kinds incl. unnamed fallback
- [x] Intersection → station referencing correct on synthetic data
- [x] Dedupe merges dual-carriageway pairs
- [x] Map markers + layer toggle; tab list sorted by station; OSM verify note
- [x] `npm run build`, `tsc --noEmit`, `eslint`, `vitest run` green
- [x] progress-tracker.md updated (U5 done)
