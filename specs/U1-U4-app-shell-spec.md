# U1/U4 Spec — App Shell + Leaflet Map Viewer

## Goal
Scaffold the React + Vite + Tailwind application shell and the Leaflet map viewer
(the primary work surface), implementing the layout from `context/ui-context.md`.
Calculation engines (U7/U8/U9, already built and tested) are not yet wired to the
UI — that comes with later units. This unit delivers a running static app with an
empty-but-functional workspace.

## Design decisions
- **Stack:** React 19 + Vite 7, TypeScript strict, Tailwind CSS v4 (via
  `@tailwindcss/vite`), react-leaflet v5, Turf (installed; used by the next unit).
- **Layout** (per ui-context.md): left rail (project tree, KMZ import entry, layer
  toggles) · center Leaflet map · right panel with tabs (Profile / Borings /
  Crossings / Results). 8px spacing rhythm; dense tables; generous map chrome.
- **Design tokens:** alignment indigo `#4f46e5`, borings amber `#d97706`, crossings
  red `#dc2626`, settlement translucent red, selected 3px outline. Base map:
  CartoDB Positron (light) default + dark option via LayersControl.
- **Typography:** system sans for UI; tabular monospace for every number (`.num`
  utility class). Every number shows its unit; stationing as `12+50`.
- **State:** minimal `ProjectContext` (React context + useReducer): project name,
  alignment (null for now), borings/crossings arrays (empty), layer visibility.
  KMZ import and boring placement arrive in later units; the import button and map
  click handler exist as labeled stubs.
- **Empty states everywhere:** "Import a KMZ to begin" — never a blank map.
- **Invariants honored:** no engine imports in UI yet (wiring is a later unit);
  WGS84 internally; GE badge component created now for reuse.
- **Quality gates:** `vite build` succeeds, `tsc --noEmit` clean, `vitest run`
  still green (42/42), ESLint + Prettier configured.

## Implementation details
- `index.html` — title "Microtunnel Design Tool", `#root`.
- `vite.config.ts` — react plugin + tailwindcss plugin.
- `src/main.tsx` — imports `index.css` + `leaflet/dist/leaflet.css`, renders App.
- `src/index.css` — `@import "tailwindcss"`, `.num` tabular-monospace utility,
  Leaflet container sizing, design-token CSS vars.
- `src/lib/format.ts` — `formatFt`, `formatStation` (12+50), `formatPsf`,
  `formatIn`, `formatKips` — every number carries its unit.
- `src/state/ProjectContext.tsx` — context, reducer, layer-visibility actions.
- `src/components/MapViewer.tsx` — MapContainer (default view: continental US),
  CartoDB Positron + dark TileLayers, LayerGroups for alignment/borings/
  crossings/settlement (empty, toggled), scale control, click stub.
- `src/components/LeftRail.tsx` — project tree stub, "Import KMZ/KML" button
  (stub → next unit), layer toggle checkboxes.
- `src/components/RightPanel.tsx` — tabs with empty states; Results tab lists the
  three tested engines and their status.
- `src/components/EmptyState.tsx`, `src/components/GeBadge.tsx`
  ("GE-derived — field verify").
- `src/App.tsx` — three-column layout shell.
- `eslint.config.js`, `.prettierrc` — flat config, TS + React Hooks + Prettier.

## Dependencies
- npm: react, react-dom, leaflet, react-leaflet, @types/leaflet, @turf/turf,
  vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite,
  eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks,
  eslint-config-prettier, prettier.

## Completion checklist
- [x] `npm run build` succeeds
- [x] `npx tsc --noEmit` clean (strict)
- [x] `npx vitest run` green (42/42 — engines untouched)
- [x] Map renders with light/dark base layers, layer toggles work, empty states shown
- [x] ESLint + Prettier configured and passing on new files
- [x] progress-tracker.md updated
- [ ] Visual check of the served app (deferred — no blocking issues; build + types green)
