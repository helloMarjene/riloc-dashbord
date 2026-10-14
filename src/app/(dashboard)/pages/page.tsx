'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, FileText, PenLine } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useActivity } from '@/contexts/ActivityContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, EmptyState, Field } from '@/components/ui';
import ConnectPanel from '@/components/ConnectPanel';
import ConfirmDialog from '@/components/ConfirmDialog';
import { parsePage, applyField, routeForFile, type ParsedPage, type PageFieldValue } from '@/lib/htmlTools';
import { formatDate } from '@/lib/format';

export default function PagesContentPage() {
  const router = useRouter();
  const ws = useWorkspace();
  const { log } = useActivity();
  const { toast } = useToast();

  const [parsed, setParsed] = useState<Array<{ path: string; page: ParsedPage; size: number; lastModified?: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [fields, setFields] = useState<PageFieldValue[]>([]);
  const [baseTitle, setBaseTitle] = useState('');
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [confirmClose, setConfirmClose] = useState(false);

  const htmlFiles = useMemo(() => {
    const out: Array<{ path: string; size: number; lastModified?: number }> = [];
    const walk = (nodes: typeof ws.tree) => {
      for (const n of nodes) {
        if (n.kind === 'file' && n.name.toLowerCase().endsWith('.html')) {
          out.push({ path: n.path, size: n.size ?? 0, lastModified: n.lastModified });
        }
        if (n.children) walk(n.children);
      }
    };
    walk(ws.tree);
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }, [ws.tree]);

  useEffect(() => {
    if (!ws.indexed) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const result: Array<{ path: string; page: ParsedPage; size: number; lastModified?: number }> = [];
      for (const f of htmlFiles) {
        try {
          const content = await ws.readContent(f.path);
          const fileName = f.path.split('/').pop() ?? f.path;
          result.push({ path: f.path, page: parsePage(fileName, content), size: f.size, lastModified: f.lastModified });
        } catch {
          /* unreadable file skipped */
        }
      }
      if (!cancelled) {
        setParsed(result);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.indexed, htmlFiles.length]);

  const openEditor = async (path: string) => {
    setEditingPath(path);
    setDirty(new Set());
    try {
      const content = await ws.readContent(path);
      const fileName = path.split('/').pop() ?? path;
      const page = parsePage(fileName, content);
      setFields(page.fields);
      setBaseTitle(page.title);
    } catch (err) {
      toast(String(err), 'error');
      setEditingPath(null);
    }
  };

  const saveFields = async () => {
    if (!editingPath) return;
    try {
      let content = await ws.readContent(editingPath);
      let applied = 0;
      for (const f of fields) {
        const result = applyField(content, f, f.value);
        if (result.applied) {
          content = result.html;
          applied++;
        }
      }
      ws.updateDraft(editingPath, content);
      log('Page content updated', 'Pages and Content', 'success', editingPath);
      toast(`Saved ${applied} field(s) into “${editingPath}” (local draft).`, 'success');
      setEditingPath(null);
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const tryClose = () => {
    if (dirty.size > 0) setConfirmClose(true);
    else setEditingPath(null);
  };

  if (!ws.indexed) {
    return (
      <div className="stack">
        <ConnectPanel
          title="Discover the RILOC pages"
          message="Connect or import the website source to list the real pages, edit their text content, or open their source code."
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <Card
        title={`Discovered Pages (${parsed.length})`}
        actions={<Badge tone="info">{ws.source === 'fs' ? 'From connected folder' : 'From imported workspace'}</Badge>}
      >
        {loading ? (
          <p className="muted">Reading pages…</p>
        ) : parsed.length === 0 ? (
          <EmptyState icon={<FileText size={22} />} title="No HTML pages found" message="The indexed source does not contain any .html files." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Route</th>
                  <th>Source file</th>
                  <th>Language</th>
                  <th>Modified in source</th>
                  <th>Local changes</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map(({ path, page, lastModified }) => {
                  const status = ws.getStatus(path);
                  return (
                    <tr key={path}>
                      <td>
                        <strong>{page.title}</strong>
                      </td>
                      <td>
                        <code style={{ fontSize: 12 }}>{page.route}</code>
                      </td>
                      <td className="muted">{path}</td>
                      <td>
                        <Badge tone="neutral">HTML</Badge>
                      </td>
                      <td className="muted">{formatDate(lastModified, false)}</td>
                      <td>
                        {status === 'original' ? (
                          <Badge tone="neutral">None</Badge>
                        ) : status === 'modified' ? (
                          <Badge tone="warning">Modified</Badge>
                        ) : status === 'saved-to-source' ? (
                          <Badge tone="success">Saved to source</Badge>
                        ) : (
                          <Badge tone="info">Exported</Badge>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <Button size="sm" variant="secondary" icon={<PenLine size={13} />} onClick={() => void openEditor(path)}>
                            Edit Content
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<Code2 size={13} />}
                            onClick={() => {
                              void ws.openFile(path);
                              router.push(`/editor?path=${encodeURIComponent(path)}`);
                            }}
                          >
                            Source
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="notice notice-info">
        <FileText size={16} />
        <p>
          Content editing writes real changes into the page’s HTML source (stored as a local draft first). Fields that
          do not exist in a page (for example a hero paragraph on a page without one) are omitted automatically.
          Complex React/Next.js components cannot be edited this way — use the Source Code Editor for those.
        </p>
      </div>

      {editingPath && (
        <div className="dialog-overlay" onClick={tryClose} role="presentation">
          <div className="dialog" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog-title">Edit Content — {routeForFile(editingPath.split('/').pop() ?? editingPath)}</h3>
            <p className="dialog-msg">File: {editingPath}. Changes are written into the HTML source as a local draft.</p>
            <div className="stack-sm" style={{ maxHeight: '52vh', overflow: 'auto', paddingRight: 6 }}>
              {fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.value.length > 90 ? (
                    <textarea
                      className="input"
                      value={f.value}
                      onChange={(e) => {
                        setFields((prev) => prev.map((x) => (x.key === f.key ? { ...x, value: e.target.value } : x)));
                        setDirty((d) => new Set(d).add(f.key));
                      }}
                    />
                  ) : (
                    <input
                      className="input"
                      value={f.value}
                      onChange={(e) => {
                        setFields((prev) => prev.map((x) => (x.key === f.key ? { ...x, value: e.target.value } : x)));
                        setDirty((d) => new Set(d).add(f.key));
                      }}
                    />
                  )}
                </Field>
              ))}
            </div>
            <div className="dialog-actions" style={{ marginTop: 18 }}>
              <Button variant="secondary" onClick={tryClose}>
                Cancel
              </Button>
              <Button onClick={() => void saveFields()}>Save to Draft</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClose}
        title="Discard content edits?"
        message={`You have unsaved field changes for “${editingPath}”. Closing without saving will discard them.`}
        confirmLabel="Discard changes"
        danger
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          setEditingPath(null);
        }}
      />
    </div>
  );
}
