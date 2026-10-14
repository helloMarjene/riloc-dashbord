'use client';

import React, { useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Copy, Download, FolderSearch, Image as ImageIcon, LayoutGrid, List, Upload, X } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import ConnectPanel from '@/components/ConnectPanel';
import { IMAGE_EXTENSIONS } from '@/lib/constants';
import { downloadBlob, formatBytes } from '@/lib/format';

export default function MediaLibraryPage() {
  const ws = useWorkspace();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const importRef = useRef<HTMLInputElement>(null);

  const images = useMemo(() => {
    const out: Array<{ path: string; size?: number; lastModified?: number }> = [];
    const walk = (nodes: typeof ws.tree) => {
      for (const n of nodes) {
        if (n.kind === 'file' && IMAGE_EXTENSIONS.some((ext) => n.name.toLowerCase().endsWith(`.${ext}`))) {
          out.push({ path: n.path, size: n.size, lastModified: n.lastModified });
        }
        if (n.children) walk(n.children);
      }
    };
    walk(ws.tree);
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }, [ws.tree]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return images;
    return images.filter((i) => i.path.toLowerCase().includes(q));
  }, [images, query]);

  const doDownload = async (path: string) => {
    const blob = await ws.readBlob(path);
    if (!blob) {
      toast('Could not read that asset.', 'error');
      return;
    }
    downloadBlob(blob, path.split('/').pop() ?? 'asset');
    toast(`Downloaded ${path}.`, 'success');
  };

  const exportSelected = async () => {
    const paths = [...selected];
    if (paths.length === 0) return;
    const zip = new JSZip();
    for (const p of paths) {
      const blob = await ws.readBlob(p);
      if (blob) zip.file(p, blob);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'riloc-media-export.zip');
    toast(`Exported ${paths.length} asset(s) as ZIP.`, 'success');
  };

  const importAsset = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !IMAGE_EXTENSIONS.some((e) => file.name.toLowerCase().endsWith(`.${e}`))) {
      toast('Unsupported file type. Please choose an image (PNG, JPG, WEBP, GIF, SVG…).', 'error');
      return;
    }
    const path = await ws.addImportedAsset(file);
    toast(`Asset imported as “${path}”.`, 'success');
  };

  if (!ws.indexed) {
    return (
      <div className="stack">
        <ConnectPanel title="Build the media library" message="Connect or import the website source to browse the real RILOC images and assets." />
      </div>
    );
  }

  const previewMeta = preview ? images.find((i) => i.path === preview) : null;

  return (
    <div className="stack">
      <div className="media-toolbar">
        <input
          className="input"
          style={{ maxWidth: 300 }}
          placeholder="Search assets by name or path…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search media"
        />
        <div className="view-toggle" role="group" aria-label="View mode">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="Grid view" aria-pressed={view === 'grid'}>
            <LayoutGrid size={15} />
          </button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="List view" aria-pressed={view === 'list'}>
            <List size={15} />
          </button>
        </div>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => importRef.current?.click()}>
          Import Asset
        </Button>
        <Button size="sm" variant="success" icon={<Download size={14} />} onClick={() => void exportSelected()} disabled={selected.size === 0}>
          Export Selected ({selected.size})
        </Button>
        <input
          ref={importRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void importAsset(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ImageIcon size={22} />}
            title={images.length === 0 ? 'No media assets found' : 'No matches'}
            message={
              images.length === 0
                ? 'The indexed source contains no image files.'
                : `Nothing matches “${query}”.`
            }
          />
        </Card>
      ) : view === 'grid' ? (
        <div className="media-grid">
          {filtered.map((img) => {
            const url = ws.mediaUrl(img.path);
            const isSel = selected.has(img.path);
            return (
              <div
                key={img.path}
                className="media-card"
                onClick={() => setPreview(img.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setPreview(img.path)}
              >
                <div className="media-thumb">{url ? <img src={url} alt={img.path} loading="lazy" /> : <span className="muted">…</span>}</div>
                <div className="media-meta">
                  <div className="media-name">{img.path.split('/').pop()}</div>
                  <div className="media-sub">
                    {formatBytes(img.size)} · {img.path}
                  </div>
                  <div className="row" style={{ marginTop: 8, gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="secondary" onClick={() => void doDownload(img.path)}>
                      <Download size={12} />
                    </Button>
                    <label className="checkbox-row" style={{ fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(img.path);
                            else next.delete(img.path);
                            return next;
                          });
                        }}
                      />
                      Select
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>File</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Relative path</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((img) => {
                  const ext = img.path.split('.').pop()?.toUpperCase() ?? '';
                  return (
                    <tr key={img.path}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(img.path)}
                          onChange={(e) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(img.path);
                              else next.delete(img.path);
                              return next;
                            })
                          }
                          aria-label={`Select ${img.path}`}
                        />
                      </td>
                      <td>
                        <strong>{img.path.split('/').pop()}</strong>
                      </td>
                      <td>
                        <Badge tone="neutral">{ext}</Badge>
                      </td>
                      <td className="muted">{formatBytes(img.size)}</td>
                      <td className="muted">{img.path}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <Button size="sm" variant="ghost" onClick={() => setPreview(img.path)}>
                            Preview
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => void doDownload(img.path)}>
                            <Download size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {preview && previewMeta && (
        <div className="preview-modal-overlay" onClick={() => setPreview(null)} role="presentation">
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-head">
              <strong style={{ wordBreak: 'break-all' }}>{previewMeta.path}</strong>
              <div className="row" style={{ gap: 6 }}>
                <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={() => void doDownload(previewMeta.path)}>
                  Download
                </Button>
                <button className="icon-btn" onClick={() => setPreview(null)} aria-label="Close preview">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="preview-modal-body">
              {ws.mediaUrl(previewMeta.path) ? (
                <img src={ws.mediaUrl(previewMeta.path)!} alt={previewMeta.path} />
              ) : (
                <p className="muted">Loading preview…</p>
              )}
              <div className="row" style={{ marginTop: 12 }}>
                <Badge tone="neutral">{previewMeta.path.split('.').pop()?.toUpperCase()}</Badge>
                <span className="muted">{formatBytes(previewMeta.size)}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    void navigator.clipboard?.writeText(previewMeta.path).then(() => toast('Path copied.', 'success'));
                  }}
                >
                  <Copy size={12} /> Copy relative path
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  title="The dashboard cannot open Windows Explorer directly from the browser"
                  onClick={() => toast('Browsers cannot open Explorer from a web page. The file lives in your connected folder under: ' + previewMeta.path, 'info')}
                >
                  <FolderSearch size={12} /> Open containing folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
