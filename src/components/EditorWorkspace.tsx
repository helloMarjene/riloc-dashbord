'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderOpen,
  FilePlus2,
  Save,
  SaveAll,
  Undo2,
  Redo2,
  RotateCcw,
  MonitorPlay,
  PackageOpen,
  FileText,
  ImageOff,
  X,
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/contexts/ToastContext';
import FileTree from './FileTree';
import CodeEditor from './CodeEditor';
import FileIcon from './FileIcon';
import ConfirmDialog from './ConfirmDialog';
import { Badge, Button, EmptyState } from './ui';
import ConnectPanel from './ConnectPanel';
import { fileTypeInfo, isImageFile, isTextLike } from '@/lib/filetypes';
import { formatBytes, formatDate } from '@/lib/format';
import { LIVE_URL } from '@/lib/constants';

const STATUS_LABEL: Record<string, { text: string; tone: 'neutral' | 'warning' | 'success' | 'info' }> = {
  original: { text: 'Original File', tone: 'neutral' },
  modified: { text: 'Modified Locally · Pending Export', tone: 'warning' },
  'saved-to-source': { text: 'Saved to Source Folder', tone: 'success' },
  exported: { text: 'Exported · not written to source', tone: 'info' },
};

function lineDiff(original: string, modified: string): { html: string; added: number; removed: number } {
  const a = original.split('\n');
  const b = modified.split('\n');
  const max = Math.max(a.length, b.length);
  let added = 0;
  let removed = 0;
  let html = '';
  for (let i = 0; i < max; i++) {
    const la = a[i];
    const lb = b[i];
    if (la === lb) {
      html += (lb ?? '') + '\n';
    } else {
      if (la !== undefined) {
        html += `<span class="diff-removed">${la.replace(/</g, '&lt;')}</span>\n`;
        removed++;
      }
      if (lb !== undefined) {
        html += `<span class="diff-added">${lb.replace(/</g, '&lt;')}</span>\n`;
        added++;
      }
    }
  }
  return { html, added, removed };
}

interface Props {
  fullToolbar?: boolean;
}

export default function EditorWorkspace({ fullToolbar = false }: Props) {
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();

  const [content, setContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [override, setOverride] = useState<{ text: string; n: number } | undefined>(undefined);
  const [conflict, setConflict] = useState<{ path: string; disk: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const historyRef = useRef<{ undo: string[]; redo: string[]; lastPush: number }>({ undo: [], redo: [], lastPush: 0 });
  const overrideCounter = useRef(0);

  const active = ws.activePath;
  const draft = active ? ws.drafts[active] : undefined;
  const status = active ? ws.getStatus(active) : 'original';

  // Load file content when the active tab changes.
  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setLoadError(null);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (!active) return;
    const info = fileTypeInfo(active.split('/').pop() ?? active);
    if (info.image) {
      void ws.readBlob(active).then((blob) => {
        if (!cancelled && blob) setImageUrl(URL.createObjectURL(blob));
      });
      return;
    }
    if (!isTextLike(active)) {
      setLoadError('This file type cannot be edited as text. Preview or download it from the Media Library instead.');
      return;
    }
    ws.readContent(active)
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          historyRef.current = { undo: [], redo: [], lastPush: 0 };
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(String(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ws.source]);

  // Warn when leaving a tab is not needed (drafts persist automatically), but
  // switching files keeps unsaved drafts — handled by the workspace.

  const handleEdit = (value: string) => {
    if (!active) return;
    const now = Date.now();
    const h = historyRef.current;
    if (now - h.lastPush > 500) {
      h.undo.push(content ?? '');
      if (h.undo.length > 120) h.undo.shift();
      h.redo = [];
      h.lastPush = now;
    }
    setContent(value);
    ws.updateDraft(active, value);
  };

  const undo = () => {
    const h = historyRef.current;
    const prev = h.undo.pop();
    if (prev === undefined || !active) return;
    h.redo.push(content ?? '');
    h.lastPush = Date.now();
    overrideCounter.current += 1;
    setOverride({ text: prev, n: overrideCounter.current });
  };

  const redo = () => {
    const h = historyRef.current;
    const next = h.redo.pop();
    if (next === undefined || !active) return;
    h.undo.push(content ?? '');
    h.lastPush = Date.now();
    overrideCounter.current += 1;
    setOverride({ text: next, n: overrideCounter.current });
  };

  const save = async (force = false) => {
    if (!active) return;
    setSaving(true);
    try {
      const result = await ws.saveToSource(active, { force });
      if (result === 'saved') toast(`Saved “${active}” to the website folder.`, 'success');
      else if (result === 'no-source') toast('Saved to the local workspace. Connect the source folder to write to disk.', 'info');
      else if (result === 'denied') toast('Write permission was denied. The file remains saved locally.', 'warning');
      else if (result === 'conflict') {
        const disk = await ws.readOriginal(active);
        setConflict({ path: active, disk });
      } else toast('The file could not be written.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    const { saved, total } = await ws.saveAllToSource();
    if (total === 0) toast('No modified files to save.', 'info');
    else toast(`Saved ${saved} of ${total} modified file(s) to the source folder.`, saved === total ? 'success' : 'warning');
  };

  const revert = () => {
    if (!active) return;
    ws.revertFile(active);
    void ws.readOriginal(active).then((original) => {
      overrideCounter.current += 1;
      setOverride({ text: original, n: overrideCounter.current });
      historyRef.current = { undo: [], redo: [], lastPush: 0 };
    });
    toast(`Reverted “${active}” to the original file.`, 'info');
  };

  const info = useMemo(() => (active ? fileTypeInfo(active.split('/').pop() ?? active) : null), [active]);
  const fileName = active ? (active.split('/').pop() ?? active) : null;
  const isImage = active ? isImageFile(fileName ?? '') : false;
  const textLike = active ? isTextLike(fileName ?? '') : false;

  if (!ws.indexed) {
    return (
      <div className="stack">
        <ConnectPanel />
      </div>
    );
  }

  const openPicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => {
      if (input.files) void ws.importFiles(input.files).then((n) => toast(`${n} file(s) imported.`, 'success'));
    };
    input.click();
  };

  return (
    <div className="editor-layout">
      {/* LEFT — file tree */}
      <div className="editor-panel editor-left">
        <div className="editor-panel-head">Website Files</div>
        <div className="editor-panel-body" style={{ padding: 10 }}>
          <FileTree
            selectedPath={active}
            onSelect={(path) => {
              void ws.openFile(path);
            }}
          />
        </div>
      </div>

      {/* CENTRE — editor */}
      <div className="editor-center">
        <div className="editor-toolbar">
          <Button size="sm" variant="secondary" icon={<FolderOpen size={14} />} onClick={() => void ws.connectFolder().then((r) => r === 'connected' && toast('Folder connected.', 'success'))}>
            Connect Folder
          </Button>
          <Button size="sm" variant="secondary" icon={<FilePlus2 size={14} />} onClick={openPicker}>
            Open File
          </Button>
          <span style={{ flex: 1 }} />
          {fullToolbar && (
            <>
              <Button size="sm" variant="secondary" icon={<Undo2 size={14} />} onClick={undo} disabled={!active || !textLike}>
                Undo
              </Button>
              <Button size="sm" variant="secondary" icon={<Redo2 size={14} />} onClick={redo} disabled={!active || !textLike}>
                Redo
              </Button>
            </>
          )}
          <Button size="sm" icon={<Save size={14} />} onClick={() => void save()} loading={saving} disabled={!active || !draft}>
            Save
          </Button>
          {fullToolbar && (
            <Button size="sm" variant="secondary" icon={<SaveAll size={14} />} onClick={() => void saveAll()} disabled={ws.stats.modifiedCount === 0}>
              Save All
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={<RotateCcw size={14} />} onClick={revert} disabled={!active || !draft}>
            Revert File
          </Button>
          <Button size="sm" variant="secondary" icon={<MonitorPlay size={14} />} onClick={() => active && router.push(`/preview?file=${encodeURIComponent(active)}`)} disabled={!active}>
            Preview Changes
          </Button>
          <Button size="sm" variant="success" icon={<PackageOpen size={14} />} onClick={() => void ws.exportModified()} disabled={ws.stats.pendingExportCount === 0}>
            Export Modified ({ws.stats.pendingExportCount})
          </Button>
        </div>

        {ws.openTabs.length > 0 && (
          <div className="editor-tabs" role="tablist">
            {ws.openTabs.map((tab) => {
              const name = tab.split('/').pop() ?? tab;
              const dirty = Boolean(ws.drafts[tab]) && ws.getStatus(tab) === 'modified';
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={tab === active}
                  className={`editor-tab ${tab === active ? 'editor-tab-active' : ''}`}
                  onClick={() => ws.setActive(tab)}
                  title={tab}
                >
                  <FileIcon name={name} size={13} />
                  <span>{name}</span>
                  {dirty && <span className="tab-dot" title="Unsaved local changes" />}
                  <span
                    className="tab-close"
                    role="button"
                    aria-label={`Close ${name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      ws.closeTab(tab);
                    }}
                  >
                    <X size={11} />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!active ? (
          <div className="editor-panel" style={{ flex: 1 }}>
            <EmptyState
              icon={<FileText size={24} />}
              title="No file open"
              message="Select a file from the directory tree to view and edit its source. Changes are stored locally until you save or export them."
            />
          </div>
        ) : isImage ? (
          <div className="editor-panel" style={{ flex: 1, overflow: 'auto' }}>
            <div className="editor-panel-body" style={{ display: 'grid', placeItems: 'center' }}>
              {imageUrl ? (
                <img src={imageUrl} alt={fileName ?? 'preview'} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8, border: '1px solid var(--border)' }} />
              ) : (
                <p className="muted">Loading image…</p>
              )}
              <p className="muted">Image files are previewed here. Manage, download and import assets in the Media Library.</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="editor-panel" style={{ flex: 1 }}>
            <EmptyState icon={<ImageOff size={24} />} title="Cannot display this file" message={loadError} />
          </div>
        ) : content === null ? (
          <div className="editor-panel" style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <p className="muted">Loading file…</p>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', borderRadius: 'var(--radius)' }}>
            <CodeEditor
              key={active}
              path={active}
              defaultValue={content}
              language={info?.lang ?? null}
              onChange={handleEdit}
              override={override}
            />
          </div>
        )}
      </div>

      {/* RIGHT — file details */}
      <div className="editor-panel editor-right">
        <div className="editor-panel-head">File Information</div>
        <div className="editor-panel-body">
          {!active ? (
            <p className="muted">Select a file to see its details.</p>
          ) : (
            <>
              <dl>
                <div className="detail-row">
                  <dt>Name</dt>
                  <dd>{fileName}</dd>
                </div>
                <div className="detail-row">
                  <dt>Type</dt>
                  <dd>{info?.label ?? 'Unknown'}</dd>
                </div>
                <div className="detail-row">
                  <dt>Size</dt>
                  <dd>{formatBytes(draft ? new Blob([draft.content]).size : ws.tree && findSize(ws.tree, active))}</dd>
                </div>
                <div className="detail-row">
                  <dt>Relative path</dt>
                  <dd>{active}</dd>
                </div>
                <div className="detail-row">
                  <dt>Modified in source</dt>
                  <dd>{formatDate(findModified(ws.tree, active), false)}</dd>
                </div>
                <div className="detail-row">
                  <dt>Status</dt>
                  <dd>
                    <Badge tone={STATUS_LABEL[status].tone}>{STATUS_LABEL[status].text}</Badge>
                  </dd>
                </div>
              </dl>

              {draft && (
                <div className="stack-sm" style={{ marginTop: 14 }}>
                  <strong style={{ fontSize: 12.5 }}>Original vs Modified</strong>
                  <DiffView modified={draft.content} getOriginal={() => ws.readOriginal(active)} />
                  <p className="muted">
                    Live website asset base used for previews: <code>{LIVE_URL}/</code>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={conflict !== null}
        title="File changed on disk"
        message={`“${conflict?.path}” has been modified outside this dashboard since it was opened. Overwriting will replace the on-disk version with your local edits.`}
        confirmLabel="Overwrite anyway"
        danger
        onCancel={() => setConflict(null)}
        onConfirm={() => {
          setConflict(null);
          void save(true);
        }}
      />
    </div>
  );
}

function DiffView({ modified, getOriginal }: { modified: string; getOriginal: () => Promise<string> }) {
  const [orig, setOrig] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getOriginal()
      .then((text) => !cancelled && setOrig(text))
      .catch(() => !cancelled && setOrig(''));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (orig === null) return <p className="muted">Comparing…</p>;
  const { html, added, removed } = lineDiff(orig, modified);
  return (
    <div>
      <p className="muted" style={{ marginBottom: 6 }}>
        <span style={{ color: 'var(--success)', fontWeight: 700 }}>+{added} lines</span> ·{' '}
        <span style={{ color: 'var(--danger)', fontWeight: 700 }}>−{removed} lines</span>
      </p>
      <div className="diff-box" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function findSize(tree: import('@/lib/types').FileNode[], path: string): number | undefined {
  for (const node of flattenNodes(tree)) {
    if (node.path === path) return node.size;
  }
  return undefined;
}
function findModified(tree: import('@/lib/types').FileNode[], path: string): number | undefined {
  for (const node of flattenNodes(tree)) {
    if (node.path === path) return node.lastModified;
  }
  return undefined;
}
function* flattenNodes(tree: import('@/lib/types').FileNode[]): Generator<import('@/lib/types').FileNode> {
  for (const n of tree) {
    if (n.kind === 'file') yield n;
    else if (n.children) yield* flattenNodes(n.children);
  }
}
