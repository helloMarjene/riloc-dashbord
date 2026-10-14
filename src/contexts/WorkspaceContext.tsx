'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  DraftEntry,
  FileNode,
  StoredFile,
  WorkspaceSource,
} from '@/lib/types';
import {
  clearDirectoryHandle,
  draftStore,
  fileStore,
  loadDirectoryHandle,
  saveDirectoryHandle,
} from '@/lib/db';
import { ssGet, ssSet } from '@/lib/storage';
import { downloadBlob, uid } from '@/lib/format';
import { isTextLike } from '@/lib/filetypes';
import {
  fsAccessSupported,
  pickDirectory,
  queryDirPermission,
  readFsFile,
  requestDirPermission,
  resolveFile,
  walkDirectory,
  writeFsFile,
  FsDirHandleLike,
  FileEntryMeta,
} from '@/lib/fsAccess';
import { EXCLUDED_EXPORT_PATTERNS, IMAGE_EXTENSIONS } from '@/lib/constants';
import { useActivity } from './ActivityContext';

const TABS_KEY = 'riloc.tabs.v1';

export type SaveResult = 'saved' | 'no-source' | 'denied' | 'conflict' | 'error';

export interface SaveConflict {
  path: string;
  diskContent: string;
  incoming: string;
}

interface WorkspaceStats {
  fileCount: number;
  pageCount: number;
  mediaCount: number;
  modifiedCount: number;
  pendingExportCount: number;
}

interface WorkspaceApi {
  source: WorkspaceSource;
  rootName: string | null;
  tree: FileNode[];
  indexed: boolean;
  indexing: boolean;
  fsSupported: boolean;
  fsPermission: PermissionState | 'unknown';
  drafts: Record<string, DraftEntry>;
  openTabs: string[];
  activePath: string | null;
  stats: WorkspaceStats;
  connectFolder: () => Promise<'connected' | 'cancelled' | 'error'>;
  reconnectFolder: () => Promise<void>;
  disconnect: () => void;
  importFiles: (files: FileList | File[]) => Promise<number>;
  importZip: (file: File) => Promise<number>;
  readContent: (path: string) => Promise<string>;
  readOriginal: (path: string) => Promise<string>;
  readBlob: (path: string) => Promise<Blob | null>;
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActive: (path: string | null) => void;
  updateDraft: (path: string, content: string) => void;
  saveToSource: (path: string, opts?: { force?: boolean }) => Promise<SaveResult>;
  saveAllToSource: () => Promise<{ saved: number; total: number }>;
  revertFile: (path: string) => void;
  exportModified: () => Promise<void>;
  exportWorkspace: () => Promise<string[]>;
  addImportedAsset: (file: File) => Promise<string>;
  clearLocalData: () => Promise<void>;
  getStatus: (path: string) => 'original' | 'modified' | 'saved-to-source' | 'exported';
  mediaUrl: (path: string) => string | null;
}

const Ctx = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}

function buildTree(entries: FileEntryMeta[]): FileNode[] {
  const root: FileNode = { path: '', name: '', kind: 'dir', children: [] };
  const dirs = new Map<string, FileNode>();
  dirs.set('', root);
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
  for (const e of sorted) {
    const parts = e.path.split('/');
    let cur = root;
    let curPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      curPath = curPath ? `${curPath}/${parts[i]}` : parts[i];
      let node = dirs.get(curPath);
      if (!node) {
        node = { path: curPath, name: parts[i], kind: 'dir', children: [] };
        dirs.set(curPath, node);
        cur.children!.push(node);
      }
      cur = node;
    }
    cur.children!.push({ path: e.path, name: parts[parts.length - 1], kind: 'file', size: e.size, lastModified: e.lastModified });
  }
  const sortRec = (n: FileNode) => {
    if (n.children) {
      n.children.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1));
      n.children.forEach(sortRec);
    }
  };
  sortRec(root);
  return root.children ?? [];
}

function flatten(tree: FileNode[]): FileNode[] {
  const out: FileNode[] = [];
  const walk = (nodes: FileNode[]) => {
    for (const n of nodes) {
      if (n.kind === 'file') out.push(n);
      else if (n.children) walk(n.children);
    }
  };
  walk(tree);
  return out;
}

function isExcluded(path: string): boolean {
  const lower = path.toLowerCase();
  if (EXCLUDED_EXPORT_PATTERNS.some((p) => lower.includes(p))) return true;
  if (/\.(pem|key|p12|pfx|crt|cer)$/.test(lower) && !lower.includes('certificate')) return true;
  return false;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { log } = useActivity();
  const [source, setSource] = useState<WorkspaceSource>('none');
  const [rootName, setRootName] = useState<string | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [indexing, setIndexing] = useState(false);
  const [fsPermission, setFsPermission] = useState<PermissionState | 'unknown'>('unknown');
  const [drafts, setDrafts] = useState<Record<string, DraftEntry>>({});
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});

  const rootRef = useRef<FsDirHandleLike | null>(null);
  const originalsRef = useRef<Map<string, string>>(new Map());
  const draftsRef = useRef<Record<string, DraftEntry>>({});
  const draftsLoaded = useRef(false);
  const persistTimer = useRef<number | null>(null);

  const indexed = tree.length > 0;

  const persistDraftsSoon = useCallback(() => {
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(async () => {
      try {
        await draftStore.clear();
        for (const d of Object.values(draftsRef.current)) {
          await draftStore.put(d);
        }
      } catch {
        /* storage full/unavailable: drafts live for the session */
      }
    }, 400);
  }, []);

  const setDraftsBoth = useCallback(
    (updater: (prev: Record<string, DraftEntry>) => Record<string, DraftEntry>) => {
      setDrafts((prev) => {
        const next = updater(prev);
        draftsRef.current = next;
        return next;
      });
      persistDraftsSoon();
    },
    [persistDraftsSoon]
  );

  const buildFsTree = useCallback(async (root: FsDirHandleLike) => {
    setIndexing(true);
    const metas: FileEntryMeta[] = [];
    try {
      await walkDirectory(root, (m) => metas.push(m));
      setTree(buildTree(metas));
      setSource('fs');
      setRootName(root.name);
      rootRef.current = root;
    } finally {
      setIndexing(false);
    }
  }, []);

  // Initial load: drafts → stored directory handle → imported files.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await draftStore.all();
        const map: Record<string, DraftEntry> = {};
        for (const d of all) map[d.path] = d;
        if (!cancelled) {
          draftsRef.current = map;
          setDrafts(map);
          draftsLoaded.current = true;
        }
      } catch {
        draftsLoaded.current = true;
      }

      const stored = await loadDirectoryHandle().catch(() => undefined);
      if (cancelled) return;
      if (stored) {
        const perm = await queryDirPermission(stored, 'read');
        if (cancelled) return;
        setFsPermission(perm);
        if (perm === 'granted') {
          await buildFsTree(stored);
        }
        return;
      }
      const imported = await fileStore.all().catch(() => [] as StoredFile[]);
      if (!cancelled && imported.length > 0) {
        setTree(
          buildTree(imported.map((f) => ({ path: f.path, size: f.size, lastModified: f.lastModified })))
        );
        setSource('import');
        setRootName('Imported workspace');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildFsTree]);

  // Restore editor tabs.
  useEffect(() => {
    const saved = ssGet<{ tabs: string[]; active: string | null } | null>(TABS_KEY, null);
    if (saved) {
      setOpenTabs(saved.tabs ?? []);
      setActivePath(saved.active ?? null);
    }
  }, []);

  useEffect(() => {
    ssSet(TABS_KEY, { tabs: openTabs, active: activePath });
  }, [openTabs, activePath]);

  const connectFolder = useCallback(async (): Promise<'connected' | 'cancelled' | 'error'> => {
    const picked = await pickDirectory();
    if (!picked) return 'cancelled';
    setIndexing(true);
    try {
      const perm = await requestDirPermission(picked, 'readwrite');
      setFsPermission(perm);
      await buildFsTree(picked);
      try {
        await saveDirectoryHandle(picked);
      } catch {
        /* handle not storable in this browser; reconnect will be required */
      }
      log('RILOC website folder connected', 'Website Manager', 'success', picked.name);
      return 'connected';
    } catch (err) {
      log('Failed to connect website folder', 'Website Manager', 'error', String(err));
      return 'error';
    } finally {
      setIndexing(false);
    }
  }, [buildFsTree, log]);

  const reconnectFolder = useCallback(async () => {
    const stored = rootRef.current ?? (await loadDirectoryHandle().catch(() => undefined));
    if (!stored) return;
    const perm = await requestDirPermission(stored, 'readwrite');
    setFsPermission(perm);
    if (perm === 'granted') {
      await buildFsTree(stored);
      log('Website folder reconnected', 'Website Manager', 'success', stored.name);
    }
  }, [buildFsTree, log]);

  const disconnect = useCallback(() => {
    rootRef.current = null;
    setSource('none');
    setTree([]);
    setRootName(null);
    setFsPermission('unknown');
    setOpenTabs([]);
    setActivePath(null);
    setMediaUrls((prev) => {
      Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
      return {};
    });
    log('Website folder disconnected', 'Website Manager', 'info');
  }, [log]);

  const importFiles = useCallback(
    async (files: FileList | File[]): Promise<number> => {
      const list = Array.from(files);
      let stored = 0;
      for (const file of list) {
        const rel = ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/\\/g, '/');
        if (isExcluded(rel)) continue;
        try {
          const textLike = isTextLike(file.name) && file.size < 8 * 1024 * 1024;
          const record: StoredFile = textLike
            ? { path: rel, text: await file.text(), size: file.size, lastModified: file.lastModified }
            : { path: rel, blob: file, size: file.size, lastModified: file.lastModified };
          await fileStore.put(record);
          stored++;
        } catch {
          /* ignore individual failures */
        }
      }
      const all = await fileStore.all();
      setTree(buildTree(all.map((f) => ({ path: f.path, size: f.size, lastModified: f.lastModified }))));
      setSource('import');
      setRootName('Imported workspace');
      log(`${stored} file(s) imported into local workspace`, 'Website Manager', 'success');
      return stored;
    },
    [log]
  );

  const importZip = useCallback(
    async (file: File): Promise<number> => {
      const zip = await JSZip.loadAsync(file);
      let stored = 0;
      const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
      for (const path of paths) {
        const normalized = path.replace(/^[^/]*\//, ''); // drop outer wrapper folder if present
        if (!normalized || isExcluded(normalized)) continue;
        const entry = zip.files[path];
        try {
          if (isTextLike(normalized)) {
            const text = await entry.async('string');
            await fileStore.put({ path: normalized, text, size: text.length, lastModified: Date.now() });
          } else {
            const blob = await entry.async('blob');
            await fileStore.put({ path: normalized, blob, size: blob.size, lastModified: Date.now() });
          }
          stored++;
        } catch {
          /* skip corrupt entry */
        }
      }
      const all = await fileStore.all();
      setTree(buildTree(all.map((f) => ({ path: f.path, size: f.size, lastModified: f.lastModified }))));
      setSource('import');
      setRootName('Imported workspace');
      log(`ZIP archive imported (${stored} files)`, 'Website Manager', 'success', file.name);
      return stored;
    },
    [log]
  );

  const readContent = useCallback(
    async (path: string): Promise<string> => {
      const draft = draftsRef.current[path];
      if (draft) return draft.content;
      const cached = originalsRef.current.get(path);
      if (cached !== undefined) return cached;
      let content: string;
      if (source === 'fs' && rootRef.current) {
        content = await readFsFile(rootRef.current, path);
      } else {
        const record = await fileStore.get(path);
        if (!record) throw new Error(`File not found: ${path}`);
        content = record.text ?? (record.blob ? await record.blob.text() : '');
      }
      originalsRef.current.set(path, content);
      return content;
    },
    [source]
  );

  const readOriginal = useCallback(
    async (path: string): Promise<string> => {
      const cached = originalsRef.current.get(path);
      if (cached !== undefined) return cached;
      let content: string;
      if (source === 'fs' && rootRef.current) {
        content = await readFsFile(rootRef.current, path);
      } else {
        const record = await fileStore.get(path);
        if (!record) throw new Error(`File not found: ${path}`);
        content = record.text ?? (record.blob ? await record.blob.text() : '');
      }
      originalsRef.current.set(path, content);
      return content;
    },
    [source]
  );

  const readBlob = useCallback(
    async (path: string): Promise<Blob | null> => {
      try {
        if (source === 'fs' && rootRef.current) {
          const handle = await resolveFile(rootRef.current, path);
          return await handle.getFile();
        }
        const record = await fileStore.get(path);
        if (!record) return null;
        if (record.blob) return record.blob;
        if (record.text !== undefined) return new Blob([record.text], { type: 'text/plain' });
        return null;
      } catch {
        return null;
      }
    },
    [source]
  );

  const openFile = useCallback(
    async (path: string) => {
      setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
      setActivePath(path);
      try {
        await readContent(path);
      } catch {
        /* content loads on demand in the editor */
      }
    },
    [readContent]
  );

  const closeTab = useCallback((path: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      setActivePath((active) => (active === path ? next[next.length - 1] ?? null : active));
      return next;
    });
  }, []);

  const setActive = useCallback((path: string | null) => {
    setActivePath(path);
  }, []);

  const updateDraft = useCallback(
    (path: string, content: string) => {
      setDraftsBoth((prev) => {
        const existing = prev[path];
        return {
          ...prev,
          [path]: {
            path,
            content,
            savedAt: Date.now(),
            savedToSourceAt: existing?.savedToSourceAt,
            exportedAt: existing?.exportedAt,
          },
        };
      });
    },
    [setDraftsBoth]
  );

  const saveToSource = useCallback(
    async (path: string, opts?: { force?: boolean }): Promise<SaveResult> => {
      const draft = draftsRef.current[path];
      if (!draft) return 'no-source';
      if (source !== 'fs' || !rootRef.current) return 'no-source';
      const root = rootRef.current;
      let perm = await queryDirPermission(root, 'readwrite');
      if (perm !== 'granted') {
        perm = await requestDirPermission(root, 'readwrite');
        setFsPermission(perm);
      }
      if (perm !== 'granted') return 'denied';
      try {
        const diskContent = await readFsFile(root, path);
        const original = originalsRef.current.get(path);
        if (!opts?.force && original !== undefined && diskContent !== original) {
          return 'conflict';
        }
        await writeFsFile(root, path, draft.content);
        originalsRef.current.set(path, draft.content);
        const now = Date.now();
        setDraftsBoth((prev) =>
          prev[path]
            ? { ...prev, [path]: { ...prev[path], savedToSourceAt: now, savedAt: prev[path].savedAt } }
            : prev
        );
        // update tree metadata
        setTree((prev) => {
          const updateNode = (nodes: FileNode[]): FileNode[] =>
            nodes.map((n) =>
              n.path === path && n.kind === 'file'
                ? { ...n, size: new Blob([draft.content]).size, lastModified: now }
                : n.children
                  ? { ...n, children: updateNode(n.children) }
                  : n
            );
          return updateNode(prev);
        });
        log('File saved to source folder', 'Source Editor', 'success', path);
        return 'saved';
      } catch (err) {
        log('Failed to save file to source folder', 'Source Editor', 'error', String(err));
        return 'error';
      }
    },
    [source, setDraftsBoth, log]
  );

  const saveAllToSource = useCallback(async (): Promise<{ saved: number; total: number }> => {
    const paths = Object.keys(draftsRef.current);
    let saved = 0;
    for (const p of paths) {
      const result = await saveToSource(p, { force: true });
      if (result === 'saved') saved++;
    }
    return { saved, total: paths.length };
  }, [saveToSource]);

  const revertFile = useCallback(
    (path: string) => {
      setDraftsBoth((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
      log('File changes discarded', 'Source Editor', 'info', path);
    },
    [setDraftsBoth, log]
  );

  const exportModified = useCallback(async (): Promise<void> => {
    const entries = Object.values(draftsRef.current).filter((d) => {
      const original = originalsRef.current.get(d.path);
      return original === undefined || original !== d.content;
    });
    if (entries.length === 0) return;
    const zip = new JSZip();
    const stamp = new Date().toISOString().slice(0, 10);
    for (const d of entries) {
      zip.file(`riloc-modified-${stamp}/${d.path}`, d.content);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `riloc-modified-files-${stamp}.zip`);
    const now = Date.now();
    setDraftsBoth((prev) => {
      const next = { ...prev };
      for (const d of entries) {
        next[d.path] = { ...next[d.path], exportedAt: now };
      }
      return next;
    });
    log(`${entries.length} modified file(s) exported as ZIP`, 'Website Manager', 'success');
  }, [setDraftsBoth, log]);

  const exportWorkspace = useCallback(async (): Promise<string[]> => {
    const files = flatten(tree);
    const zip = new JSZip();
    const excluded: string[] = [];
    const stamp = new Date().toISOString().slice(0, 10);
    for (const node of files) {
      if (isExcluded(node.path)) {
        excluded.push(node.path);
        continue;
      }
      const draft = draftsRef.current[node.path];
      if (draft) {
        zip.file(`riloc-website-${stamp}/${node.path}`, draft.content);
        continue;
      }
      try {
        if (source === 'fs' && rootRef.current) {
          zip.file(`riloc-website-${stamp}/${node.path}`, await readFsFile(rootRef.current, node.path));
        } else {
          const record = await fileStore.get(node.path);
          if (!record) continue;
          if (record.text !== undefined) zip.file(`riloc-website-${stamp}/${node.path}`, record.text);
          else if (record.blob) zip.file(`riloc-website-${stamp}/${node.path}`, record.blob);
        }
      } catch {
        excluded.push(node.path);
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `riloc-website-export-${stamp}.zip`);
    log('Website workspace exported as ZIP', 'Website Manager', 'success');
    return excluded;
  }, [tree, source, log]);

  const addImportedAsset = useCallback(
    async (file: File): Promise<string> => {
      const base = 'imported-media';
      let path = `${base}/${file.name}`;
      const existing = new Set(flatten(tree).map((f) => f.path));
      let counter = 1;
      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
      const stem = ext ? file.name.slice(0, -ext.length) : file.name;
      while (existing.has(path)) {
        path = `${base}/${stem}-${counter}${ext}`;
        counter++;
      }
      await fileStore.put({ path, blob: file, size: file.size, lastModified: file.lastModified });
      const all = await fileStore.all();
      setTree(buildTree(all.map((f) => ({ path: f.path, size: f.size, lastModified: f.lastModified }))));
      if (source === 'none') {
        setSource('import');
        setRootName('Imported workspace');
      }
      log('Asset imported into media library', 'Media Library', 'success', path);
      return path;
    },
    [tree, source, log]
  );

  const clearLocalData = useCallback(async (): Promise<void> => {
    await draftStore.clear().catch(() => undefined);
    await fileStore.clear().catch(() => undefined);
    await clearDirectoryHandle().catch(() => undefined);
    draftsRef.current = {};
    originalsRef.current.clear();
    setDrafts({});
    disconnect();
    log('Local workspace data cleared', 'Settings', 'warning');
  }, [disconnect, log]);

  const getStatus = useCallback(
    (path: string): 'original' | 'modified' | 'saved-to-source' | 'exported' => {
      const d = drafts[path];
      if (!d) return 'original';
      if (d.savedToSourceAt && d.savedAt <= d.savedToSourceAt) return 'saved-to-source';
      if (d.exportedAt && d.savedAt <= d.exportedAt) return 'exported';
      return 'modified';
    },
    [drafts]
  );

  const mediaUrl = useCallback(
    (path: string): string | null => {
      return mediaUrls[path] ?? null;
    },
    [mediaUrls]
  );

  // Lazily resolve object URLs for media files.
  useEffect(() => {
    const files = flatten(tree).filter((f) => IMAGE_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(`.${ext}`)));
    const missing = files.filter((f) => !mediaUrls[f.path]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const f of missing.slice(0, 40)) {
        const blob = await readBlob(f.path);
        if (blob) next[f.path] = URL.createObjectURL(blob);
      }
      if (!cancelled && Object.keys(next).length > 0) {
        setMediaUrls((prev) => ({ ...prev, ...next }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, source]);

  const stats = useMemo<WorkspaceStats>(() => {
    const files = flatten(tree);
    const modified = Object.values(drafts).filter((d) => {
      const original = originalsRef.current.get(d.path);
      return original === undefined || original !== d.content;
    });
    return {
      fileCount: files.length,
      pageCount: files.filter((f) => f.name.toLowerCase().endsWith('.html')).length,
      mediaCount: files.filter((f) => IMAGE_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(`.${ext}`))).length,
      modifiedCount: modified.length,
      pendingExportCount: modified.filter((d) => !(d.exportedAt && d.savedAt <= d.exportedAt)).length,
    };
  }, [tree, drafts]);

  const api: WorkspaceApi = {
    source,
    rootName,
    tree,
    indexed,
    indexing,
    fsSupported: fsAccessSupported(),
    fsPermission,
    drafts,
    openTabs,
    activePath,
    stats,
    connectFolder,
    reconnectFolder,
    disconnect,
    importFiles,
    importZip,
    readContent,
    readOriginal,
    readBlob,
    openFile,
    closeTab,
    setActive,
    updateDraft,
    saveToSource,
    saveAllToSource,
    revertFile,
    exportModified,
    exportWorkspace,
    addImportedAsset,
    clearLocalData,
    getStatus,
    mediaUrl,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
