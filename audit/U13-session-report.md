# Session Report — U13 Project file save/open (2026-09-22)

## What was built
U13 — local project file save/open, per `specs/U13-project-file-spec.md`,
answering the user's question about saving a project locally for later use
or sharing for review.

**New modules**
- `src/io/project-file.ts` — pure serialize/parse/validate:
  - `serializeProject(state)` → pretty-printed JSON, schema `version: 1`
  - `parseProjectFile(text)` → structural validation, typed `ProjectFileError`
    (`INVALID_JSON`, `UNSUPPORTED_VERSION`, `INVALID_SCHEMA` naming the field)
  - `toProjectFileData` extracts the durable slice (projectName, alignment,
    waypoints, importWarnings, profile, borings, cases, selectedCaseId,
    crossings); transient UI (placingBoring, selection, importError, layers)
    is excluded
  - `projectFileName` → `<slug>-<date>.microtunnel.json`
- `src/io/project-file.test.ts` — 6 tests: round-trip equality, version stamp,
  invalid JSON, unsupported version, bad shapes (missing name, bad station
  coordinates), filename.
- `src/lib/download.ts` — generic `downloadFile(filename, text, mime)`; the
  report's `downloadHtml` is now a thin wrapper over it.

**State + UI**
- `ProjectContext` — new `LOAD_PROJECT` action: replaces durable state, resets
  transient UI.
- `LeftRail` "Project" section — "Save project" (downloads the file) and "Open
  project" (file picker for `.microtunnel.json`/`.json`). Opening over a
  non-empty project asks for confirmation; parse errors display in the rail.
  Hint text states nothing is stored automatically.

## Verification
- `tsc --noEmit` clean, `eslint` clean, production build succeeds.
- 12 test files, 103/103 tests pass (6 new project-file tests).

## Decisions / caveats
- Explicit file the user owns — no autosave/localStorage; a refresh still
  starts clean (stated in the UI).
- Schema v1 only; newer/older versions are rejected with a clear message rather
  than migrated.

## Remaining work
- U12 — Deployment (static build, verified on a real project file)
- Broader data-model validation/persistence if still required
- User hand-calc countersigns for REF-01, FP-01, ST-01
- Live visual/browser QA of the app
