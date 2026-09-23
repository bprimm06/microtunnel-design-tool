import { useRef, useState } from 'react';
import { useProject } from '../state/ProjectContext';
import type { LayerVisibility } from '../state/ProjectContext';
import { importFile } from '../io/kmz';
import { ImportError } from '../io/kmz-errors';
import {
  parseProjectFile,
  projectFileName,
  serializeProject,
  ProjectFileError,
  PROJECT_FILE_EXT,
} from '../io/project-file';
import {
  ensureWritePermission,
  pickOpenFile,
  pickSaveLocation,
  readHandle,
  supportsFS,
  writeHandle,
} from '../io/file-system';
import { clearHandle, saveHandle } from '../io/handle-store';
import { downloadFile } from '../lib/download';
import { formatFt } from '../lib/format';
import EmptyState, { PanelSection } from './EmptyState';
import GeBadge from './GeBadge';

const LAYER_META: { key: keyof LayerVisibility; label: string; color: string }[] = [
  { key: 'alignment', label: 'Alignment', color: '#4f46e5' },
  { key: 'borings', label: 'Borings', color: '#d97706' },
  { key: 'crossings', label: 'Crossings', color: '#dc2626' },
  { key: 'settlement', label: 'Settlement overlay', color: 'rgba(220,38,38,0.45)' },
];

export default function LeftRail() {
  const {
    state,
    setProjectName,
    toggleLayer,
    setImportResult,
    setImportError,
    clearAlignment,
    loadProject,
    setFileLink,
    markSaving,
    markIdle,
    markSaved,
    markSaveError,
    setNeedsReconnect,
  } = useProject();
  const fileRef = useRef<HTMLInputElement>(null);
  const projectFileRef = useRef<HTMLInputElement>(null);
  const [projectFileError, setProjectFileError] = useState<string | null>(null);
  const fsSupported = supportsFS();

  const hasProjectData =
    state.alignment !== null || state.borings.length > 0 || state.cases.length > 0;

  /** Write the current project to a granted handle. */
  const writeToHandle = async (
    handle: FileSystemFileHandle,
    requestPermission: boolean,
  ): Promise<boolean> => {
    markSaving();
    try {
      if (!(await ensureWritePermission(handle, { request: requestPermission }))) {
        setNeedsReconnect(true);
        markIdle();
        return false;
      }
      await writeHandle(handle, serializeProject(state));
      markSaved(new Date().toISOString());
      return true;
    } catch (e) {
      markSaveError(e instanceof Error ? e.message : String(e));
      return false;
    }
  };

  /** Remember a user-chosen location for future autosaves. */
  const linkHandle = async (handle: FileSystemFileHandle, fileName: string) => {
    try {
      await saveHandle(handle, fileName);
    } catch {
      // IndexedDB unavailable — the link lasts for this session only.
    }
    setFileLink(handle, fileName);
  };

  const downloadCopy = () => {
    const savedAt = new Date().toISOString();
    downloadFile(
      projectFileName(state.projectName, savedAt),
      serializeProject(state),
      'application/json;charset=utf-8',
    );
    markSaved(savedAt);
  };

  const saveProject = async () => {
    setProjectFileError(null);
    if (!fsSupported) {
      downloadCopy();
      return;
    }
    if (state.fileHandle && !state.needsReconnect) {
      await writeToHandle(state.fileHandle, false);
      return;
    }
    // First save (or after unlink): ask the user where to put the file.
    let handle: FileSystemFileHandle | null;
    try {
      handle = await pickSaveLocation(
        projectFileName(state.projectName, new Date().toISOString()),
      );
    } catch (e) {
      // A rejected picker (SecurityError, NotAllowedError, …) must not die as
      // an unhandled rejection with zero UI feedback.
      console.error('Save project: file picker failed', e);
      markSaveError(
        e instanceof DOMException ? `${e.name}: ${e.message}` : String(e),
      );
      return;
    }
    if (!handle) return; // user cancelled the picker
    await linkHandle(handle, handle.name);
    await writeToHandle(handle, true);
  };

  const saveAs = async () => {
    setProjectFileError(null);
    if (!fsSupported) {
      downloadCopy();
      return;
    }
    let handle: FileSystemFileHandle | null;
    try {
      handle = await pickSaveLocation(
        projectFileName(state.projectName, new Date().toISOString()),
      );
    } catch (e) {
      // A rejected picker must surface in the UI, not die silently.
      console.error('Save as: file picker failed', e);
      markSaveError(
        e instanceof DOMException ? `${e.name}: ${e.message}` : String(e),
      );
      return;
    }
    if (!handle) return; // user cancelled the picker
    await linkHandle(handle, handle.name);
    await writeToHandle(handle, true);
  };

  const applyProjectText = (text: string): boolean => {
    try {
      const data = parseProjectFile(text);
      if (
        hasProjectData &&
        !window.confirm('Open this project file? Your current project will be replaced.')
      ) {
        return false;
      }
      loadProject(data);
      return true;
    } catch (e) {
      setProjectFileError(
        e instanceof ProjectFileError
          ? `Could not open (${e.code}): ${e.message}`
          : `Could not open: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  };

  /** Fallback path for browsers without the File System Access API. */
  const openProject = async (file: File | undefined) => {
    if (!file) return;
    setProjectFileError(null);
    applyProjectText(await file.text());
  };

  const openProjectPicker = async () => {
    setProjectFileError(null);
    const handle = await pickOpenFile();
    if (!handle) return;
    let text: string;
    try {
      text = await readHandle(handle);
    } catch (e) {
      setProjectFileError(`Could not read file: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    if (!applyProjectText(text)) return;
    // Autosave follows the opened file.
    await linkHandle(handle, handle.name);
    setNeedsReconnect(!(await ensureWritePermission(handle, { request: true })));
  };

  const unlink = async () => {
    try {
      await clearHandle();
    } catch {
      // Ignore — the in-memory link is what matters.
    }
    setFileLink(null, null);
    markIdle();
  };

  const reconnect = async () => {
    if (!state.fileHandle) return;
    setNeedsReconnect(!(await ensureWritePermission(state.fileHandle, { request: true })));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await importFile(await file.arrayBuffer(), file.name);
      setImportResult(result);
    } catch (e) {
      const msg =
        e instanceof ImportError
          ? `Import failed (${e.code}): ${e.message}`
          : `Import failed: ${e instanceof Error ? e.message : String(e)}`;
      setImportError(msg);
    }
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <PanelSection title="Project">
        <input
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          value={state.projectName}
          onChange={(e) => setProjectName(e.target.value)}
          aria-label="Project name"
        />
        {state.linkedFileName && (
          <p className="mt-1 truncate text-[11px] text-gray-600" title={state.linkedFileName}>
            Linked: <span className="font-medium">{state.linkedFileName}</span>
          </p>
        )}
        {state.needsReconnect && state.linkedFileName ? (
          <p className="mt-1 text-[11px] text-amber-800">
            File access needs re-approval.{' '}
            <button type="button" className="underline" onClick={() => void reconnect()}>
              Reconnect
            </button>
          </p>
        ) : state.saveStatus === 'saving' ? (
          <p className="mt-1 text-[11px] text-gray-500">Saving…</p>
        ) : state.saveStatus === 'saved' && state.lastSavedAt ? (
          <p className="mt-1 text-[11px] text-gray-500">
            {state.linkedFileName ? 'Autosaved' : 'Saved'}{' '}
            {new Date(state.lastSavedAt).toLocaleTimeString()}
          </p>
        ) : state.saveStatus === 'error' ? (
          <p className="mt-1 text-[11px] text-red-700">
            Save failed{state.saveError ? `: ${state.saveError}` : ''}.{' '}
            <button type="button" className="underline" onClick={() => void saveProject()}>
              Retry
            </button>
          </p>
        ) : null}
        <input
          ref={projectFileRef}
          type="file"
          accept={`.json,${PROJECT_FILE_EXT},.microtunnel.json`}
          className="sr-only"
          aria-label="Open project file"
          onChange={(e) => {
            void openProject(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
            onClick={() => void saveProject()}
          >
            Save project
          </button>
          {fsSupported && (
            <button
              type="button"
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => void saveAs()}
            >
              Save as…
            </button>
          )}
        </div>
        <button
          type="button"
          className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => {
            if (fsSupported) void openProjectPicker();
            else projectFileRef.current?.click();
          }}
        >
          Open project
        </button>
        {state.linkedFileName && (
          <button
            type="button"
            className="mt-1 text-[11px] text-gray-500 underline"
            onClick={() => void unlink()}
          >
            Unlink file (stop autosave)
          </button>
        )}
        <p className="mt-1 text-[11px] text-gray-500">
          {fsSupported
            ? 'First save asks where to put the file; changes autosave to it after that.'
            : 'This browser can’t grant file access, so saving downloads a copy each time.'}
        </p>
        {projectFileError && (
          <p className="mt-1 text-[11px] font-medium text-red-700">{projectFileError}</p>
        )}
      </PanelSection>

      <PanelSection title="Import">
        <input
          ref={fileRef}
          type="file"
          accept=".kmz,.kml"
          className="sr-only"
          aria-label="Import KMZ or KML file"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="w-full rounded bg-indigo-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          onClick={() => fileRef.current?.click()}
        >
          Import KMZ / KML
        </button>
        <p className="mt-1 text-[11px] text-gray-500">
          Alignment LineStrings and waypoint borings from Google Earth.
        </p>
        {state.importError && (
          <p className="mt-1 text-[11px] font-medium text-red-700">{state.importError}</p>
        )}
      </PanelSection>

      <PanelSection title="Layers">
        <ul className="space-y-1">
          {LAYER_META.map(({ key, label, color }) => (
            <li key={key}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={state.layers[key]}
                  onChange={() => toggleLayer(key)}
                  className="h-3.5 w-3.5 accent-indigo-600"
                />
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-gray-300"
                  style={{ backgroundColor: color }}
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
      </PanelSection>

      <div className="flex-1 overflow-y-auto">
        {state.alignment ? (
          <div>
            <PanelSection title="Alignment">
              <p className="text-sm font-medium text-gray-800">{state.alignment.name}</p>
              <p className="num text-xs text-gray-600">
                {formatFt(state.alignment.lengthFt, 0)} ·{' '}
                {state.alignment.stations.length} stations
              </p>
              <p className="mt-1">
                <GeBadge />
              </p>
              <button
                type="button"
                className="mt-2 text-[11px] text-red-700 underline"
                onClick={() => {
                  if (window.confirm('Remove the loaded alignment and waypoints?')) {
                    clearAlignment();
                  }
                }}
              >
                Remove alignment
              </button>
            </PanelSection>
            {state.waypoints.length > 0 && (
              <PanelSection title={`Waypoints (${state.waypoints.length})`}>
                <ul className="max-h-32 space-y-0.5 overflow-y-auto">
                  {state.waypoints.map((w, i) => (
                    <li key={`${w.name}-${i}`} className="text-xs text-gray-700">
                      {w.name}{' '}
                      <span className="num text-gray-500">
                        {w.lat.toFixed(5)}, {w.lon.toFixed(5)}
                      </span>
                    </li>
                  ))}
                </ul>
              </PanelSection>
            )}
            {state.importWarnings.length > 0 && (
              <PanelSection title="Import notes">
                <ul className="space-y-1">
                  {state.importWarnings.map((w, i) => (
                    <li key={i} className="text-[11px] text-amber-800">
                      {w}
                    </li>
                  ))}
                </ul>
              </PanelSection>
            )}
          </div>
        ) : (
          <EmptyState
            title="No alignment loaded"
            hint="Import a KMZ to begin — the alignment, borings, and crossings will appear here."
          />
        )}
      </div>
    </aside>
  );
}
