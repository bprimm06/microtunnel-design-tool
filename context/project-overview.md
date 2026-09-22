# Project Overview — Microtunnel Design Tool

## What it is
A web-based engineering workspace for microtunneling design. An engineer imports an
alignment from Google Earth, builds the geotechnical picture along it, and gets the three
core design calculations: **jacking force**, **face/support pressure**, and **surface
settlement**. All engine math follows **ASCE 36-15, Standard Design and Construction
Guidelines for Microtunneling**.

## Who it's for
Trenchless/pipeline engineers doing feasibility and preliminary design of microtunnel
drives (single-user to start; the primary user is a working trenchless engineer).

## Core user flows
1. **Import** a Google Earth KMZ/KML (points and lines) → coordinates and elevations
   extracted, alignment stationed (chainage 0+00…) on a Leaflet map.
2. **Review crossings/obstacles** — OpenStreetMap data pulled along the alignment
   corridor and displayed: roads, railways, waterways, buildings, utilities.
3. **Place geotech borings** on the map — depth auto-fills to **profile depth + 20 ft**
   (minimum), user-overridable.
4. **Run calculations** per drive: jacking force vs. allowable (incl. intermediate
   jacking station spacing), required face pressure, predicted settlement trough.
5. **Review results** in profile view, result tables, and an exportable calc summary.

## Success criteria (v1)
- A real project KMZ imports: alignment stations correctly, elevations extract.
- OSM crossings render along the alignment with station + type.
- Boring placement auto-depths to profile depth + 20 ft.
- Jacking, face pressure, and settlement results each match an independent hand calc
  within agreed tolerance on a reference case.
- Results always show inputs, assumptions, and units next to every number.

## Out of scope (v1) — do not build or suggest
- Not a substitute for signed engineering judgment; the tool assists, it does not stamp.
- No automated construction control or real-time machine-data integration.
- No structural pipe design beyond jacking-load checks.
- No cost estimating.
- No multi-user accounts, auth, or cloud sync — single-user local projects.
- Web app first; no native mobile app.
