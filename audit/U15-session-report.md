# U15 Session Report — NWI Wetlands Crossing Kind (2026-09-22)

## What was built
NWI wetlands as a sixth crossing kind (`wetland`), station-referenced against
the alignment — same UX as OSM crossings. User-approved scope after the
ConEdison/NYC crossing demo (2026-09-22).

## Source verification (do not regress)
- Old endpoint `www.fws.gov/wetlands/arcgis/rest/services/Wetlands/MapServer`
  is **dead** (404 after FWS site redesign) — do not use.
- Live endpoint (USGS-hosted, federal steward's current service):
  `https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0/query`
- Layer 0 `Wetlands`, esriGeometryPolygon, ~38M features, maxRecordCount 1000.
- Query: `geometry` = JSON envelope
  `{xmin,ymin,xmax,ymax,spatialReference:{wkid:4326}}`,
  `geometryType=esriGeometryEnvelope`, `inSR=4326`,
  `spatialRel=esriSpatialRelIntersects`, `outFields` qualified
  (`Wetlands.ATTRIBUTE`, `Wetlands.WETLAND_TYPE`, `Wetlands.ACRES`),
  `f=geojson`, `outSR=4326`.
- GeoJSON property keys are qualified (`Wetlands.ATTRIBUTE` etc.) — request
  `outFields=*` when debugging, qualified names in production.
- A bare `geometry=xmin,ymin,xmax,ymax` string does NOT work for
  esriGeometryEnvelope — must be the JSON envelope object.
- Gotcha: `outFields=Wetlands.ATTRIBUTE` returns keys as `Wetlands.ATTRIBUTE`
  (not `ATTRIBUTE`) — an early test read the wrong key and saw nulls.

## Implementation
- `src/osm/nwi.ts` (new): envelope builder, query-string builder, GeoJSON
  parser, `fetchNWI` with injected-fetch for tests. `NwiError` codes:
  NO_ALIGNMENT / NETWORK / TIMEOUT / BAD_RESPONSE.
- `src/osm/types.ts`: `CrossingKind` += `'wetland'`.
- `src/osm/crossings.ts`: `detectWetlandCrossings` (reuses `buildingHit`
  polygon path; boundary hit else centroid projection); `detectCrossings`
  refactored onto shared `mergeCrossings` (no behavior change).
  Wetland crossing: `id=nwi/<OBJECTID>`, `name`=WETLAND_TYPE,
  `detail`=`NWI <ATTRIBUTE> · <ACRES> ac — field verify`, `osmType='nwi'`.
- `CrossingsTab`: wetland checkbox (6 kinds), parallel Overpass+NWI via
  `Promise.allSettled`, partial-failure warning naming the failed source,
  NWI disclaimer: "NWI wetlands are screening data (1:12,000 aerial imagery),
  not a legal or jurisdictional determination — field delineation governs.
  NWI-derived — field verify."
- `CrossingMarkers`: wetland color `#0d9488` (teal).

## Verification
- `tsc` clean, ESLint clean, production build succeeds.
- **116/116 Vitest tests pass** (106 before + 10 new in `src/osm/nwi.test.ts`).
- Live on https://bprimm06.github.io/microtunnel-design-tool/ (commit
  `1bd0563`, Pages workflow green): ConEdison alignment import + Detect
  crossings — wetland checkbox present, disclaimer present, 11 road crossings,
  **zero wetland crossings** (correct: direct service query of the corridor
  also returns 0 NWI polygons), no failure warnings → browser→NWI request
  path (CORS) confirmed working.

## Deployment
- Pushed `1bd0563` to `main` via user-approved device flow; `gh auth logout`
  completed after (per standing preference — no authenticated GitHub host in
  workspace).
