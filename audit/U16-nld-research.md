# U16 Research — NLD Public Service Verification (2026-09-22)

## Verified live service
- **Base URL:** `https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/NLD2_PUBLIC_v1/FeatureServer`
- Published by ArcGIS Online org `Esri_US_Federal_Data` (USACE NLD 2.0 public data;
  found via ArcGIS Online search; NLD's own hosts `maps.crrel.usace.army.mil` and
  `levees.sec.usace.army.mil/arcgis` are dead — confirmed HTTP 000 / 404).
- Root fetch HTTP 200. `capabilities: Query,Extract`, `maxRecordCount: 1000`,
  `supportedQueryFormats: JSON` (`f=geojson` works), `hasStaticData: true`.
- CORS: `Access-Control-Allow-Origin: *` — direct browser `fetch` works.
- Query-by-envelope works identically to standard ArcGIS REST
  (`geometry`, `geometryType=esriGeometryEnvelope`, `inSR=4326`, `outSR=4326`,
  `spatialRel=esriSpatialRelIntersects`).

## Layers (17 total, 0–16)
Recommended for crossings:
- **10 — `Embankments`** — `esriGeometryPolyline` (levee centerline segments;
  display field `SEGMENT_NAME`). Reuse the road/rail Turf line-intersection path.
- **16 — `Leveed_Areas`** — `esriGeometryPolygon` (levee-protected area;
  display field `SYSTEM_NAME`). Reuse the building/wetland path (boundary
  intersection, else centroid projection).
- Other polyline layers available: 6 `Alignment_Lines`, 7 `Closure_Structures`,
  9 `Cross_Sections`, 11 `Floodwalls`, 14 `System_Routes`, 15 `Toe_Drains`.

## Field names (exact, verified from layer metadata)
### Layer 10 — Embankments
OBJECTID, SEGMENT_ID, SEGMENT_NAME, SYSTEM_ID, SYSTEM_NAME, EMBANK_ID,
SLOPE_LANDSIDE, SLOPE_WATERSIDE, PRIMARY_MATERIAL, SURVEY_DATE, DATA_SOURCE,
GAGE_CODE, GAGE_OWNER, STATES, COUNTIES, COMMUNITY_NAMES, DIVISIONS,
DISTRICTS, FEMA_REGION_NAMES, CONGRESSIONAL_DISTRICTS, AIANNH_NAMES, SPONSORS,
SPONSOR_ROLE, SPONSOR_TYPE, FLOOD_SOURCES, RESPONSIBLE_ORGANIZATION,
Shape__Length. (Also SE_ANNO_CAD_DATA — a Blob; do NOT request in outFields.)

### Layer 16 — Leveed_Areas
OBJECTID, SYSTEM_ID, SYSTEM_NAME, LEVEED_ID, STATES, COUNTIES,
COMMUNITY_NAMES, DIVISIONS, DISTRICTS, FEMA_REGION_NAMES,
CONGRESSIONAL_DISTRICTS, AIANNH_NAMES, SPONSORS, SPONSOR_ROLE, SPONSOR_TYPE,
LEVEED_AREA_METHOD, COMPUTED_TERRAIN_SOURCE, TERRAIN_SOURCE_YEAR,
EGRESS_NUMBER, WARNING_SYSTEM, OVERTOPPING_ACE, REHAB_PROGRAM_STATUS,
RESPONSIBLE_ORGANIZATION, LEVEED_AREA_SQ_MI, FEMA_ACCREDITATION_RATING,
FLOOD_SOURCES, SEG_COUNT, MRT_PROJECT, Shape__Area, Shape__Length.
(Also SE_ANNO_CAD_DATA — a Blob; do NOT request in outFields.)

## Sample queries (Sacramento, CA envelope −121.6,38.5,−121.4,38.7)
Polylines (layer 10) — HTTP 200, GeoJSON, **226 features**, e.g.
"MA 09 - City of Sacramento - American R left bank" / system 5205000441 /
"American River FCD - Unit 4, American River left bank":

```
https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/NLD2_PUBLIC_v1/FeatureServer/10/query?where=1%3D1&geometry=-121.6%2C38.5%2C-121.4%2C38.7&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=SYSTEM_NAME%2CSYSTEM_ID%2CSEGMENT_NAME%2CSTATES&returnGeometry=true&outSR=4326&f=geojson
```

Polygons (layer 16) — HTTP 200, GeoJSON, **13 features**, e.g.
"West Sacramento" / system 5205000903 / FEMA "Accredited Levee System":

```
https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/NLD2_PUBLIC_v1/FeatureServer/16/query?where=1%3D1&geometry=-121.6%2C38.5%2C-121.4%2C38.7&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=SYSTEM_NAME%2CSYSTEM_ID%2CSTATES%2CFEMA_ACCREDITATION_RATING&returnGeometry=true&outSR=4326&f=geojson
```

## REST/JSON alternative
OGC API-Features variant also live (HTTP 200, valid OGC landing page):
`https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/National_Levee_Database/OGCFeatureServer`
Not needed for U16 — the ArcGIS REST FeatureServer already returns JSON/GeoJSON
with the same envelope-query pattern as the existing NWI integration.

## Notes for implementation
- Use a narrow explicit `outFields` list (never `*`); the CAD blob field
  `SE_ANNO_CAD_DATA` is excluded from the lists above.
- `maxRecordCount` 1000 is far above what a microtunnel corridor envelope returns.
- `SYSTEM_ID` (e.g. 5205000392) matches the ID scheme in NLD public URLs such as
  `https://levees.sec.usace.army.mil/#/levees/system/5205000392/summary`.
