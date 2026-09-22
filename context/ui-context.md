# UI Context — Microtunnel Design Tool

## Layout: map-dominant engineering workspace
- **Left rail:** project tree, import (KMZ/KML), layer toggles (alignment, borings,
  crossings, settlement overlay).
- **Center:** Leaflet map — the primary work surface. Click-to-place borings here.
- **Right panel (tabs):** Profile · Borings · Crossings · Results.
- **Profile tab:** ground surface vs. tunnel invert vs. boring sticks on one
  chainage-vs-elevation chart; the depth rule (+20 ft) visible as a dashed line.

## Design tokens
- Alignment: indigo `#4f46e5` · Borings: amber `#d97706` · Crossings: red `#dc2626` ·
  Settlement trough overlay: translucent red · Selected: 3px outline.
- Base map: light tiles default (CartoDB Positron-style), dark tile option.
- Typography: system sans for UI; **tabular monospace for every number**.
- Spacing rhythm: 8px base; dense data tables, generous map chrome.

## Component conventions
- **Every number shows its unit** (`1,240 ft`, `850 psf`, `0.4 in`). No exceptions —
  this is a safety rule, not a style choice.
- Stationing format: `12+50` (hundreds+remainder).
- Every result block shows: inputs summary → values → assumptions → warnings.
  GE-derived elevations carry a "GE-derived — field verify" badge wherever shown.
- Boring editor: depth field pre-fills from the +20 ft rule with the derivation shown
  ("invert 34.2 ft + 20 ft = 54.2 ft"); manual override allowed, derivation preserved.
- Destructive actions (delete alignment, clear borings) always confirm.
- Empty states explain the next step ("Import a KMZ to begin" — not a blank map).
