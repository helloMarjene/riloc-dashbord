// Minimal promise-based IndexedDB wrapper. Used for larger local data:
// editor drafts, imported file contents, the custom avatar, and the
// (structured-cloneable) FileSystemDirectoryHandle in Chromium browsers.

import { DraftEntry, StoredFile } from './types';
import type { FsDirHandleLike } from './fsAccess';

const DB_NAME = 'riloc-dashboard-db';
const DB_VERSION = 1;

export type StoreName = 'drafts' | 'files' | 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'path' });
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'path' });
      }
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
  return dbPromise;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const request = run(t.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
      })
  );
}

export const idb = {
  async put<T>(store: StoreName, value: T, key?: string): Promise<void> {
    await tx(store, 'readwrite', (s) => (key !== undefined ? s.put(value, key) : s.put(value)));
  },
  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    return (await tx<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>)) ?? undefined;
  },
  async del(store: StoreName, key: string): Promise<void> {
    await tx(store, 'readwrite', (s) => s.delete(key));
  },
  async clear(store: StoreName): Promise<void> {
    await tx(store, 'readwrite', (s) => s.clear());
  },
  async all<T>(store: StoreName): Promise<T[]> {
    const result = await tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
    return result ?? [];
  },
};

// Typed helpers
export const draftStore = {
  all: () => idb.all<DraftEntry>('drafts'),
  put: (d: DraftEntry) => idb.put('drafts', d),
  del: (path: string) => idb.del('drafts', path),
  clear: () => idb.clear('drafts'),
};

export const fileStore = {
  all: () => idb.all<StoredFile>('files'),
  put: (f: StoredFile) => idb.put('files', f),
  get: (path: string) => idb.get<StoredFile>('files', path),
  del: (path: string) => idb.del('files', path),
  clear: () => idb.clear('files'),
};

export const kvStore = {
  put: (key: string, value: unknown) => idb.put('kv', value, key),
  get: <T>(key: string) => idb.get<T>('kv', key),
  del: (key: string) => idb.del('kv', key),
};

export async function saveDirectoryHandle(handle: FsDirHandleLike): Promise<void> {
  // FileSystemDirectoryHandle is structured-cloneable in Chromium.
  await kvStore.put('sourceDirHandle', handle);
}

export async function loadDirectoryHandle(): Promise<FsDirHandleLike | undefined> {
  return kvStore.get<FsDirHandleLike>('sourceDirHandle');
}

export async function clearDirectoryHandle(): Promise<void> {
  await kvStore.del('sourceDirHandle');
}
