# U14 Spec — Autosave to a user-chosen file

## Goal
The user asked for autosave where "the tool should ask where the user would
like to save the file and allow access." Implemented with the File System
Access API: first save asks for a location, the handle is retained (persisted
in IndexedDB), and subsequent changes autosave to that file without prompting.

## Design decisions
- **New modules:**
  - `src/io/file-system.ts` — `supportsFS()` (feature-detect
    `showSaveFilePicker`/`showOpenFilePicker`), `pickSaveLocation(name)`,
    `pickOpenFile()`, `readHandle(handle)`, `writeHandle(handle, text)`,
    `ensureWritePermission(handle)` (query then request).
  - `src/io/handle-store.ts` — tiny IndexedDB wrapper persisting
    `{ handle, fileName }` under key `projectFile` (handles are
    structured-cloneable). `saveHandle`, `loadHandle`, `clearHandle`.
  - `src/components/AutosaveManager.tsx` — mounted in App: on launch restores
    the stored handle and checks (not requests) permission; a debounced
    (1.5 s) effect writes the durable slice on state change; reports status.
- **State** (ProjectContext, session-only, never serialized):
  `fileHandle`, `linkedFileName`, `saveStatus: 'idle'|'saving'|'saved'|'error'`,
  `lastSavedAt: string | null`, `needsReconnect: boolean`.
- **Flows:**
  - Save: handle + permission → write now. Else if FS supported → save picker
    (user chooses location) → write → store handle. Else → download fallback.
  - Save as…: always picks a new location, then writes and stores.
  - Open: FS picker when supported → parse → confirm-if-dirty → load → store
    handle so autosave follows the opened file (permission requested in the
    click gesture). Fallback: hidden file input as today.
  - Unlink: clears the stored handle; autosave stops; file on disk untouched.
  - Reload with a stored handle: permission is queried silently; if not
    granted, the rail shows the linked name with a Reconnect button (permission
    request requires a user gesture).
- **LeftRail Project section:** linked-file indicator, save status line
  ("Autosaved 6:02 PM" / "Saving…" / error), Save / Save as… / Open buttons,
  Unlink text button. When FS is unsupported, the section behaves as before
  (manual downloads) with a hint.
- **Tests:** pure/decision logic — `supportsFS()` false in node; permission
  decision helper; handle-store is DOM-dependent (not unit-tested); round-trip
  coverage already proves the durable slice excludes transient UI.
- **TS types:** File System Access API ships in TS 5.9's DOM lib; if any member
  is missing, add a minimal ambient declaration file instead of `any` casts.

## Out of scope
- Autosave to localStorage (explicit user-owned file only, per the request).
- Conflict handling for externally edited files (last write wins; noted in hint).
- "New project" reset.

## Completion checklist
- [x] First save asks for a location; later saves write silently
- [x] Handle survives reload via IndexedDB; reconnect flow works
- [x] Debounced autosave on project changes with visible status
- [x] Save as… / Open / Unlink all work; fallback path when FS unsupported
- [x] `npm run build`, `tsc --noEmit`, `eslint`, `vitest run` green
- [x] progress-tracker.md updated (U14 done)
