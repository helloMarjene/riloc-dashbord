// Structural types for the File System Access API. Declared locally so the
// project compiles without @types/wicg-file-system-access and degrades
// gracefully in browsers that do not support the API.

export type PermMode = 'read' | 'readwrite';

export interface FsWritable {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}

export interface FsFileHandleLike {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FsWritable>;
}

export interface FsDirHandleLike {
  kind: 'directory';
  name: string;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FsFileHandleLike>;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FsDirHandleLike>;
  entries(): AsyncIterableIterator<[string, FsDirHandleLike | FsFileHandleLike]>;
  queryPermission?(desc: { mode: PermMode }): Promise<PermissionState>;
  requestPermission?(desc: { mode: PermMode }): Promise<PermissionState>;
}

export interface FileEntryMeta {
  path: string;
  size: number;
  lastModified: number;
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.svn', '.hg']);

export function fsAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';
}

export async function pickDirectory(): Promise<FsDirHandleLike | null> {
  if (!fsAccessSupported()) return null;
  try {
    const picker = (window as unknown as { showDirectoryPicker: (o?: { id?: string; mode?: string }) => Promise<FsDirHandleLike> })
      .showDirectoryPicker;
    return await picker({ id: 'riloc-source', mode: 'readwrite' });
  } catch {
    return null; // user cancelled or API unavailable
  }
}

export async function queryDirPermission(dir: FsDirHandleLike, mode: PermMode): Promise<PermissionState> {
  try {
    if (dir.queryPermission) return await dir.queryPermission({ mode });
  } catch {
    /* fall through */
  }
  return 'prompt';
}

export async function requestDirPermission(dir: FsDirHandleLike, mode: PermMode): Promise<PermissionState> {
  try {
    if (dir.requestPermission) return await dir.requestPermission({ mode });
  } catch {
    /* fall through */
  }
  return 'prompt';
}

export async function walkDirectory(
  root: FsDirHandleLike,
  onFile: (meta: FileEntryMeta) => void
): Promise<number> {
  let count = 0;
  async function walk(dir: FsDirHandleLike, prefix: string, depth: number): Promise<void> {
    if (depth > 12) return;
    let children: Array<[string, FsDirHandleLike | FsFileHandleLike]>;
    try {
      children = [];
      for await (const entry of dir.entries()) children.push(entry);
    } catch {
      return;
    }
    for (const [name, child] of children) {
      if (child.kind === 'directory') {
        if (SKIP_DIRS.has(name)) continue;
        await walk(child as FsDirHandleLike, prefix ? `${prefix}/${name}` : name, depth + 1);
      } else {
        try {
          const file = await (child as FsFileHandleLike).getFile();
          const path = prefix ? `${prefix}/${name}` : name;
          onFile({ path, size: file.size, lastModified: file.lastModified });
          count++;
        } catch {
          /* unreadable file: skip */
        }
      }
    }
  }
  await walk(root, '', 0);
  return count;
}

// Resolve "a/b/c.css" to a file handle beneath root. Throws when missing.
export async function resolveFile(root: FsDirHandleLike, path: string, createDirs = false): Promise<FsFileHandleLike> {
  const parts = path.split('/').filter(Boolean);
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create: createDirs });
  }
  return dir.getFileHandle(parts[parts.length - 1], { create: createDirs });
}

export async function readFsFile(root: FsDirHandleLike, path: string): Promise<string> {
  const handle = await resolveFile(root, path);
  const file = await handle.getFile();
  return file.text();
}

export async function writeFsFile(root: FsDirHandleLike, path: string, content: string): Promise<void> {
  const handle = await resolveFile(root, path, true);
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}
