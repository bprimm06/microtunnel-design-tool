# U13 Spec — Project file save / open

## Goal
The user can save the whole project locally as one JSON file and re-open it
later (or share it for review) — closing the "refresh wipes everything" gap
the user asked about.

## Design decisions
- **Format:** single JSON document, extension `.microtunnel.json`, schema
  `version: 1`. Pretty-printed (2-space) so it diffs sanely.
- **Durable state saved:** projectName, alignment, waypoints, importWarnings,
  profile (input + result), borings, cases, selectedCaseId, crossings.
  Transient UI (`placingBoring`, `selectedBoringId`, `importError`, layer
  toggles) is NOT saved — it resets on open.
- **Pure module** (`src/io/project-file.ts`):
  - `serializeProject(state): string`
  - `parseProjectFile(text): ProjectFileData` — JSON parse + structural
    validation; throws typed `ProjectFileError`:
    `INVALID_JSON`, `UNSUPPORTED_VERSION`, `INVALID_SCHEMA` (names the bad field).
  - `projectFileName(projectName, savedAt): string`
- **Validation** is structural: required top-level keys, arrays where arrays
  belong, finite numbers for station lat/lon/chainage and boring/crossing
  coordinates. It guards against crashes, not semantic correctness.
- **UI** (LeftRail "Project" section): "Save project" downloads the file;
  "Open project" reads a `.microtunnel.json` file. Opening over a non-empty
  project asks for confirmation. Parse errors show in the rail.
- **State:** new `LOAD_PROJECT` action replaces durable state, resets transient
  UI. Save uses the live state directly — no stale copies.
- **Tests:** round-trip serialize→parse preserves data; invalid JSON / wrong
  version / missing keys / non-finite coordinates all throw the right code.

## Out of scope
- Autosave / localStorage (explicit file the user owns; a refresh still starts
  clean — say so in the UI hint).
- "New project" reset button.
- Forward/backward migration (version 1 only; unsupported versions are rejected
  with a clear message).

## Completion checklist
- [x] Serialize covers all durable state; transient UI excluded
- [x] Parse validates and throws typed errors
- [x] Save/Open wired in the Project section with confirm + error display
- [x] Round-trip test passes
- [x] `npm run build`, `tsc --noEmit`, `eslint`, `vitest run` green
- [x] progress-tracker.md updated (U13 done)
