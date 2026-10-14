'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Cpu, FolderOpen, FolderSync, Unplug, Upload, FileArchive, PackageOpen, AlertTriangle } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card } from '@/components/ui';
import EditorWorkspace from '@/components/EditorWorkspace';
import ConfirmDialog from '@/components/ConfirmDialog';
import { fileTypeInfo } from '@/lib/filetypes';

export default function WebsiteManagerPage() {
  const ws = useWorkspace();
  const { toast } = useToast();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);
  const [excluded, setExcluded] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  // Detect the technologies actually present in the indexed source files.
  const tech = useMemo(() => {
    const found = new Map<string, number>();
    const walk = (nodes: typeof ws.tree) => {
      for (const n of nodes) {
        if (n.kind === 'file') {
          const label = fileTypeInfo(n.name).label;
          found.set(label, (found.get(label) ?? 0) + 1);
        }
        if (n.children) walk(n.children);
      }
    };
    walk(ws.tree);
    return [...found.entries()].sort((a, b) => b[1] - a[1]);
  }, [ws.tree]);

  const doExport = async () => {
    setConfirmExport(false);
    const list = await ws.exportWorkspace();
    setExcluded(list);
    if (list.length > 0) toast(`Export finished with ${list.length} excluded file(s).`, 'warning');
    else toast('Website workspace exported as ZIP.', 'success');
  };

  return (
    <div className="stack">
      <div className="grid-2">
        <Card
          title="Source Connection"
          actions={
            <Badge tone={ws.source === 'fs' ? 'success' : ws.source === 'import' ? 'info' : 'neutral'}>
              {ws.source === 'fs' ? 'Folder connected' : ws.source === 'import' ? 'Imported workspace' : 'Not connected'}
            </Badge>
          }
        >
          <div className="stack-sm">
            <dl>
              <div className="detail-row">
                <dt>Source</dt>
                <dd>{ws.source === 'fs' ? `Local folder “${ws.rootName}”` : ws.source === 'import' ? 'Browser workspace (imported)' : 'None'}</dd>
              </div>
              <div className="detail-row">
                <dt>Folder permission</dt>
                <dd>{ws.source === 'fs' ? (ws.fsPermission === 'granted' ? 'Read & write granted' : `Permission: ${ws.fsPermission}`) : '—'}</dd>
              </div>
              <div className="detail-row">
                <dt>Files indexed</dt>
                <dd>{ws.indexed ? ws.stats.fileCount : '—'}</dd>
              </div>
              <div className="detail-row">
                <dt>Locally modified</dt>
                <dd>{ws.stats.modifiedCount}</dd>
              </div>
            </dl>
            <div className="row">
              <Button size="sm" variant="secondary" icon={<FolderOpen size={14} />} onClick={() => void ws.connectFolder().then((r) => r === 'connected' && toast('Website folder connected.', 'success'))}>
                {ws.source === 'fs' ? 'Connect Different Folder' : 'Connect RILOC Website Folder'}
              </Button>
              {ws.source === 'fs' && ws.fsPermission !== 'granted' && (
                <Button size="sm" variant="secondary" icon={<FolderSync size={14} />} onClick={() => void ws.reconnectFolder()}>
                  Reconnect (grant permission)
                </Button>
              )}
              <Button size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
                Import Files
              </Button>
              <Button size="sm" variant="secondary" icon={<FileArchive size={14} />} onClick={() => zipRef.current?.click()}>
                Import ZIP
              </Button>
              <Button size="sm" variant="success" icon={<PackageOpen size={14} />} onClick={() => setConfirmExport(true)} disabled={!ws.indexed}>
                Export Website ZIP
              </Button>
              {ws.source !== 'none' && (
                <Button size="sm" variant="ghost" icon={<Unplug size={14} />} onClick={() => setConfirmDisconnect(true)}>
                  Disconnect
                </Button>
              )}
            </div>
            <p className="muted">
              The browser cannot see absolute paths. Select <code>C:\Users\ADMIN\Desktop\RILOC-SUMMARY\RILOCS-MAIN</code> when
              prompted — the dashboard reads only what you grant access to.
            </p>
          </div>
        </Card>

        <Card
          title="Technologies Detected"
          actions={<Cpu size={16} className="muted" />}
        >
          {!ws.indexed ? (
            <p className="muted">Connect or import the website source to detect the technologies it uses.</p>
          ) : tech.length === 0 ? (
            <p className="muted">No files indexed yet.</p>
          ) : (
            <>
              <div className="row">
                {tech.map(([label, count]) => (
                  <Badge key={label} tone="info">
                    {label} × {count}
                  </Badge>
                ))}
              </div>
              <p className="muted">
                These are the languages and formats found in the actual indexed files — nothing is assumed. Editing
                support matches each file extension automatically.
              </p>
            </>
          )}
        </Card>
      </div>

      <EditorWorkspace />

      {excluded.length > 0 && (
        <div className="notice notice-warning">
          <AlertTriangle size={16} />
          <p>
            The last export excluded {excluded.length} file(s): {excluded.join(', ')}. Sensitive files (node_modules, .git,
            .env files, private keys, credentials) are never included in exported archives.
          </p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void ws.importFiles(e.target.files).then((n) => toast(`${n} file(s) imported.`, 'success'));
          e.target.value = '';
        }}
      />
      <input
        ref={zipRef}
        type="file"
        accept=".zip"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void ws.importZip(f).then((n) => toast(`ZIP imported: ${n} file(s).`, 'success'));
          e.target.value = '';
        }}
      />

      <ConfirmDialog
        open={confirmDisconnect}
        title="Disconnect website folder?"
        message="The dashboard will forget the folder handle. Local drafts and imported files are kept until you clear workspace data in Settings."
        confirmLabel="Disconnect"
        danger
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={() => {
          setConfirmDisconnect(false);
          ws.disconnect();
          toast('Website folder disconnected.', 'info');
        }}
      />
      <ConfirmDialog
        open={confirmExport}
        title="Export complete website workspace?"
        message="A ZIP archive of every indexed file (with your local edits applied) will be downloaded. Sensitive files are excluded and reported afterwards. This does not publish anything to the live website."
        confirmLabel="Export ZIP"
        onCancel={() => setConfirmExport(false)}
        onConfirm={() => void doExport()}
      />
    </div>
  );
}
