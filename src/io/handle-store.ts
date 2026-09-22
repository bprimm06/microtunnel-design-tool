/**
 * Persist the user's chosen project file handle in IndexedDB so autosave
 * survives reloads. Handles are structured-cloneable. DOM-only.
 */
export interface StoredHandle {
  handle: FileSystemFileHandle;
  fileName: string;
}

const DB_NAME = 'microtunnel-tool';
const STORE = 'file-handles';
const KEY = 'projectFile';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

async function withDb<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}

function commit(t: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error ?? new Error('IndexedDB transaction failed'));
  });
}

export async function saveHandle(handle: FileSystemFileHandle, fileName: string): Promise<void> {
  await withDb(async (db) => {
    const t = db.transaction(STORE, 'readwrite');
    const put = request(t.objectStore(STORE).put({ handle, fileName }, KEY));
    await commit(t);
    await put;
  });
}

export async function loadHandle(): Promise<StoredHandle | null> {
  return withDb(async (db) => {
    const t = db.transaction(STORE, 'readonly');
    const get = request<unknown>(t.objectStore(STORE).get(KEY));
    const value = await get;
    await commit(t);
    if (!value || typeof value !== 'object') return null;
    const v = value as Record<string, unknown>;
    if (!v.handle || typeof v.fileName !== 'string') return null;
    return { handle: v.handle as FileSystemFileHandle, fileName: v.fileName };
  });
}

export async function clearHandle(): Promise<void> {
  await withDb(async (db) => {
    const t = db.transaction(STORE, 'readwrite');
    const del = request(t.objectStore(STORE).delete(KEY));
    await commit(t);
    await del;
  });
}
