# U15 Spec — NWI Wetlands as a Crossing Kind

## Goal
Surface USFWS National Wetlands Inventory (NWI) polygons as a `wetland`
crossing kind, station-referenced against the alignment — same UX as OSM
crossings. Approved by the user 2026-09-22 after the ConEdison/NYC crossing
demo raised USACE channels, culverts, levees, and wetlands as the real
permitting concerns.

## Source (verified 2026-09-22)
- **Endpoint (live):**
  `https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0/query`
  (USGS-hosted, federal steward's current service; the old
  `www.fws.gov/wetlands/arcgis/rest/services/Wetlands/MapServer` is dead —
  404 after the FWS site redesign.)
- Layer 0 `Wetlands`, `esriGeometryPolygon`, ~38M features, maxRecordCount 1000.
- Query params: `geometry` = JSON envelope `{xmin,ymin,xmax,ymax,
  spatialReference:{wkid:4326}}`, `geometryType=esriGeometryEnvelope`,
  `inSR=4326`, `spatialRel=esriSpatialRelIntersects`,
  `outFields=Wetlands.ATTRIBUTE,Wetlands.WETLAND_TYPE,Wetlands.ACRES`,
  `returnGeometry=true`, `f=geojson`, `outSR=4326`.
- GeoJSON property keys are qualified: `Wetlands.ATTRIBUTE` (Cowardin code,
  e.g. `E1UBLx`), `Wetlands.WETLAND_TYPE` (e.g. `Estuarine and Marine
  Deepwater`), `Wetlands.ACRES`.
- ArcGIS REST sends CORS headers — browser `fetch` works (same as Overpass).

## Design decisions
- New `CrossingKind`: `'wetland'`. Reuses the `Crossing` shape:
  `id: nwi/<OBJECTID>`, `name`: WETLAND_TYPE, `detail`:
  `NWI <ATTRIBUTE> · <ACRES> ac`, `osmType: 'nwi'`, `osmId`: OBJECTID.
- One **Detect crossings** action queries Overpass + NWI in parallel with the
  same corridor half-width, merges, sorts by station, dedupes (100 ft window,
  same as roads). Partial failure: if one source fails, the other source's
  results still display with a warning naming the failed source.
- Polygon handling reuses the building path: boundary intersection with the
  alignment, else centroid projection (`buildingHit` generalized).
- UI: `wetland` checkbox in the kind filter, teal marker color, list rows show
  name + station + NWI code/acreage detail. Tab carries the disclaimer
  **"NWI-derived — field verify"** next to the OSM one.
- Engineering caveat (shown in UI, recorded here): NWI is mapped from aerial
  imagery at 1:12,000 for regional screening — NOT a legal/regulatory or
  jurisdictional product. Field delineation governs. Never present an NWI hit
  as a permitted/established wetland boundary.

## Out of scope
- USACE National Levee Database (separate source, separate unit if wanted).
- USACE navigable channels (no single national GIS layer — district data).
- Culverts (no national inventory).
- NWI raster/image service, riparian layer, status layer.

## Completion checklist
- [ ] `src/osm/nwi.ts`: envelope builder, fetch, GeoJSON parse — pure + tested
- [ ] `CrossingKind` includes `'wetland'`; detection merges NWI polygons
- [ ] CrossingsTab: wetland filter checkbox, parallel queries, partial-failure warning, NWI disclaimer
- [ ] Marker color + legend for wetland
- [ ] Tests green, `tsc` clean, production build succeeds
- [ ] Live verification on the ConEdison alignment (or another real alignment)
- [ ] progress-tracker.md updated (U15 done)
