# U21 Spec — GIS ground elevations (USGS 3DEP)

## Goal
Answer the user's report: KMZ paths clamped to ground in Google Earth export
altitude `0` on every vertex, so the importer faithfully wrote 0.0 ft ground
everywhere. (1) Detect that case at import instead of silently using zeros.
(2) Offer one-click ground fetch from USGS 3DEP (NAVD88, ~10 m, CONUS,
no key, CORS `*` — verified 2026-09-22).

## Design decisions
1. **Clamped detection (pure, `buildStations`):** when `groundSource ===
   'kmz'` and at least one vertex has a defined altitude and *every* defined
   altitude is exactly 0 → no ground assigned, warning:
   "KMZ altitudes are all zero — the path is likely clamped to ground in
   Google Earth, so no usable ground elevations were imported. Fetch 3DEP
   elevations or enter surveyed values in the Profile tab."
   `geGroundElevFt` also stays unset (zeros are not data; nothing to restore).
   Mixed zero/non-zero keeps current interpolate behavior.
2. **Fetch module `src/gis/elevation.ts`** (network lives here, like
   `src/osm/overpass.ts`; engines stay pure):
   - `buildEpqsUrl(lat, lon)` — pure URL builder, `units=Feet`, `wkid=4326`.
   - `fetchElevationFt(lat, lon)` — single point, 15 s timeout, `GisError`
     codes: `GIS_NETWORK`, `GIS_TIMEOUT`, `GIS_RATE_LIMITED` (429),
     `GIS_NO_DATA` (null value = outside coverage).
   - `fetchGroundForStations(stations, onProgress)` — sequential with
     250 ms politeness gap, per-station results, partial failures reported
     (fetch continues).
3. **Provenance:** new `ElevSource` value `'3dep'`; badge "3DEP-derived —
   field verify" (blue tint, distinct from GE amber — different datum).
4. **State:** pure `setStationsGround(stations, updates, source)` in
   `stationing.ts` + `SET_STATIONS_GROUND` context action.
5. **UI (Profile tab Ground section):** "Fetch ground from 3DEP" button with
   progress (`Fetching 12/47…`), failure summary, graceful error box.
   No import-dialog change — fetch is an explicit user action, not a
   surprise network burst at import.
6. **Help modal:** document the 3DEP source alongside the KMZ/manual ground
   docs.

## Out of scope
- Auto-fetch at import; batch endpoints; non-CONUS DEM sources.
- Changing the U17 manual-import backup discrepancy (tracked separately).

## Completion checklist
- [x] Clamped KMZ detected: no 0.0 ft ground, actionable warning
- [x] 3DEP fetch works per-station with progress + partial-failure handling
- [x] `3dep` provenance badge; manual-entry editing still marks `survey`
- [x] Tests: clamped detection, URL builder, parse/errors (mocked fetch),
      bulk progress + partial failure, setStationsGround
- [x] tsc clean, ESLint clean, 148/148 tests green, production build succeeds
- [x] progress-tracker.md updated (U21 done)
