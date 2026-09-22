/**
 * File System Access API wrappers. The app asks the user where to save once;
 * the retained handle then allows silent autosaves. Unsupported browsers
 * (Safari, Firefox, iOS) fall back to manual download/upload.
 */
import { PROJECT_FILE_EXT } from './project-file';

/** True when the browser supports user-chosen file read/write. */
export function supportsFS(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.showSaveFilePicker === 'function' &&
    typeof window.showOpenFilePicker === 'function'
  );
}

const FILE_TYPES: FilePickerAcceptType[] = [
  {
    description: 'Microtunnel project',
    accept: { 'application/json': [PROJECT_FILE_EXT] },
  },
];

function cancelled(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/** Ask the user where to save. Null when they cancel. */
export async function pickSaveLocation(
  suggestedName: string,
): Promise<FileSystemFileHandle | null> {
  try {
    return await window.showSaveFilePicker({ suggestedName, types: FILE_TYPES });
  } catch (e) {
    if (cancelled(e)) return null;
    throw e;
  }
}

/** Ask the user which project file to open. Null when they cancel. */
export async function pickOpenFile(): Promise<FileSystemFileHandle | null> {
  try {
    const [handle] = await window.showOpenFilePicker({ types: FILE_TYPES, multiple: false });
    return handle ?? null;
  } catch (e) {
    if (cancelled(e)) return null;
    throw e;
  }
}

export async function readHandle(handle: FileSystemFileHandle): Promise<string> {
  return (await handle.getFile()).text();
}

export async function writeHandle(handle: FileSystemFileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(text);
  } finally {
    await writable.close();
  }
}

/**
 * True when we may write without prompting. With request: true, asks the user
 * (must be called in a user gesture); otherwise only checks silently.
 */
export async function ensureWritePermission(
  handle: FileSystemFileHandle,
  opts: { request: boolean },
): Promise<boolean> {
  const descriptor = { mode: 'readwrite' } as const;
  if ((await handle.queryPermission(descriptor)) === 'granted') return true;
  if (!opts.request) return false;
  return (await handle.requestPermission(descriptor)) === 'granted';
}
