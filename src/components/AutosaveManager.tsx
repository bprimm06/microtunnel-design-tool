/**
 * Autosave wiring. On launch, restores the user's previously chosen save
 * location (if any) and silently checks permission. Afterwards, debounced
 * writes persist the durable project slice on every change. Renders nothing.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useProject } from '../state/ProjectContext';
import { serializeProject, toProjectFileData } from '../io/project-file';
import { ensureWritePermission, supportsFS, writeHandle } from '../io/file-system';
import { loadHandle } from '../io/handle-store';

const DEBOUNCE_MS = 1500;

export default function AutosaveManager() {
  const { state, setFileLink, markSaving, markIdle, markSaved, markSaveError, setNeedsReconnect } =
    useProject();
  const durableJson = useMemo(() => JSON.stringify(toProjectFileData(state)), [state]);
  const skipFirst = useRef(true);

  // Restore the stored save location on launch (permission checked silently —
  // requesting requires a user gesture, handled by the Reconnect button).
  useEffect(() => {
    if (!supportsFS()) return;
    let cancelled = false;
    void (async () => {
      try {
        const stored = await loadHandle();
        if (!stored || cancelled) return;
        const ok = await ensureWritePermission(stored.handle, { request: false });
        if (cancelled) return;
        setFileLink(stored.handle, stored.fileName);
        setNeedsReconnect(!ok);
      } catch {
        // IndexedDB unavailable — autosave stays off; manual save still works.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave on project changes.
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    if (!supportsFS() || !state.fileHandle || state.needsReconnect) return;
    const timer = setTimeout(() => {
      const handle = state.fileHandle;
      if (!handle) return;
      void (async () => {
        markSaving();
        try {
          const ok = await ensureWritePermission(handle, { request: false });
          if (!ok) {
            setNeedsReconnect(true);
            markIdle();
            return;
          }
          await writeHandle(handle, serializeProject(state));
          markSaved(new Date().toISOString());
        } catch (e) {
          markSaveError(e instanceof Error ? e.message : String(e));
        }
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // Re-run when the durable project data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durableJson]);

  return null;
}
