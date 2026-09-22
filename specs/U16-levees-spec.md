# U16 Spec — USACE National Levee Database as a Crossing Kind

## Goal
Surface USACE National Levee Database (NLD) features as a `levee` crossing
kind, station-referenced against the alignment — same UX as OSM and NWI
crossings. Approved by the user 2026-09-22; levees were named as one of the
real permitting concerns on the ConEdison/NYC drive.

## Source (verified live 2026-09-22)
- **Endpoint (live):**
  `https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/NLD2_PUBLIC_v1/FeatureServer/10/query`
  (ArcGIS Online, published by the `Esri_US_Federal_Data` org — USACE NLD 2.0
  public data. The old NLD hosts `maps.crrel.usace.army.mil` and
  `levees.sec.usace.army.mil/arcgis` are dead — confirmed empty reply / 404.)
- Layer 10 `Embankments`, `esriGeometryPolyline` (levee centerline segments),
  maxRecordCount 1000, capabilities Query,Extract, CORS `*` — browser fetch
  works, same as NWI/Overpass.
- Query params: `where=1=1`, `geometry` = JSON envelope
  `{xmin,ymin,xmax,ymax,spatialReference:{wkid:4326}}`,
  `geometryType=esriGeometryEnvelope`, `inSR=4326`,
  `spatialRel=esriSpatialRelIntersects`,
  `outFields=OBJECTID,SEGMENT_ID,SEGMENT_NAME,SYSTEM_ID,SYSTEM_NAME,STATES,SPONSORS`,
  `returnGeometry=true`, `f=geojson`, `outSR=4326`.
- GeoJSON property keys are plain field names (e.g. `SYSTEM_NAME`) — no layer
  qualification, unlike the NWI MapServer.
- Layer 16 `Leveed_Areas` (protected-area polygons) intentionally NOT queried
  in U16: being inside a leveed area is not a levee crossing. The embankment
  line is what the alignment would physically cross.

## Design decisions
- New `CrossingKind`: `'levee'`. Reuses the `Crossing` shape:
  `id: nld/<OBJECTID>`, `name`: SEGMENT_NAME (fallback SYSTEM_NAME, then
  "levee segment"), `detail`:
  `NLD <SYSTEM_NAME> · seg <SEGMENT_ID> — field verify`, `osmType: 'nld'`,
  `osmId`: OBJECTID.
- Line-segment handling reuses the road/rail path (`firstLineHit`): each NLD
  embankment polyline gets its first (lowest-station) alignment intersection.
- One **Detect crossings** action queries Overpass + NWI + NLD in parallel with
  the same corridor half-width, merges, sorts by station, dedupes (100 ft
  window). Partial failure: if any source fails, the others' results still
  display with a warning naming the failed source.
- Marker color: distinct from road/rail/water/building/utility/wetland —
  proposed **amber/brown** (e.g. `#b45309`); update legend accordingly.
- UI: `levee` checkbox in the kind filter; tab carries the disclaimer
  **"NLD-derived — field verify"** next to the OSM/NWI ones.
- Engineering caveat (shown in UI, recorded here): NLD is a national
  inventory of levee systems and their condition ratings — a screening
  product, not a jurisdictional determination and not a substitute for
  coordination with the levee sponsor / USACE district. Levee crossings may
  trigger Section 408 permission requirements. Never present an NLD hit as a
  complete or authoritative levee record.

## Out of scope
- USACE navigable channels (no single national GIS layer — district data).
- Culverts (no national inventory).
- State/district levee datasets that supersede or supplement NLD.
- Section 408 permitting workflow (separate concern).

## Completion checklist
- [x] `src/osm/nld.ts`: envelope builder, fetch, GeoJSON parse — pure + tested
- [x] `CrossingKind` includes `'levee'`; detection merges NLD features
- [x] CrossingsTab: levee filter checkbox, three-source parallel queries,
      partial-failure warning, NLD disclaimer
- [x] Marker color + legend for levee
- [x] Tests green, `tsc` clean, production build succeeds
- [x] Live verification on a real alignment (ConEdison or another)
- [x] progress-tracker.md updated (U16 done)
