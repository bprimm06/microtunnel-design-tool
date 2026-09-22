# Session Report — U14 Autosave to user-chosen file (2026-09-22)

## What was built
U14 — autosave where the tool asks once where to save and retains access, per
`specs/U14-autosave-spec.md`, built on the File System Access API.

**New modules**
- `src/types/file-system-access.d.ts` — minimal ambient declarations (TS 5.9's
  DOM lib has FileSystemFileHandle but not the picker functions or permission
  methods).
- `src/io/file-system.ts` — `supportsFS()`, `pickSaveLocation()`,
  `pickOpenFile()`, `readHandle()`, `writeHandle()`, `ensureWritePermission()`
  (silent check vs. user-gesture request). Picker cancellations return null.
- `src/io/handle-store.ts` — tiny IndexedDB wrapper persisting
  `{ handle, fileName }` under `microtunnel-tool/file-handles/projectFile`.
- `src/components/AutosaveManager.tsx` — mounted in App: restores the stored
  handle on launch (permission queried silently), then debounced (1.5 s) writes
  of the durable project slice on change. Renders nothing.
- `src/io/file-system.test.ts` — 3 tests: no FS support in node, silent
  permission check, request path.

**State + UI**
- `ProjectContext` — session-only fields (never serialized): `fileHandle`,
  `linkedFileName`, `saveStatus` (idle/saving/saved/error), `lastSavedAt`,
  `saveError`, `needsReconnect`, plus actions/methods.
- `LeftRail` Project section — Save project (asks for a location on first
  save, then writes silently), Save as…, Open project (picker; autosave follows
  the opened file), Unlink file, Reconnect button when the browser needs
  re-approval after reload, and a status line ("Saving…" / "Autosaved 6:02 PM"
  / error + Retry). Opening over a non-empty project still confirms.
- Fallback: browsers without the API (Safari, Firefox, iOS) keep the U13
  behavior — Save downloads a copy, Open uses a file input — with an honest
  hint in the rail.

## Verification
- `tsc --noEmit` clean, `eslint` clean, production build succeeds.
- 13 test files, 106/106 tests pass.

## Decisions / caveats
- Debounce (not per-keystroke) avoids write churn; last write wins if the file
  is edited externally.
- iOS browsers don't support the File System Access API, so the ask-once
  autosave is a desktop-Chrome/Edge experience; iPhone/iPad get downloads.

## Remaining work
- U12 — Deployment (static build, verified on a real project file)
- Broader data-model validation/persistence if still required
- User hand-calc countersigns for REF-01, FP-01, ST-01
- Live visual/browser QA of the app
