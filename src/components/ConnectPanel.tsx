'use client';

import React, { useRef, useState } from 'react';
import { FolderOpen, Upload, FileArchive, Globe, Loader2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/contexts/ToastContext';
import { Button, Card } from './ui';
import { DEFAULT_SOURCE_PATH } from '@/lib/constants';

interface Props {
  title?: string;
  message?: string;
}

// Shown wherever the website source has not been connected/imported yet.
export default function ConnectPanel({ title, message }: Props) {
  const { connectFolder, importFiles, importZip, fsSupported, indexing } = useWorkspace();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const doConnect = async () => {
    setBusy(true);
    try {
      const result = await connectFolder();
      if (result === 'cancelled') toast('Folder selection was cancelled.', 'info');
      else if (result === 'error') toast('Could not read that folder. Check browser support and permissions.', 'error');
      else toast('RILOC website folder connected.', 'success');
    } finally {
      setBusy(false);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const n = await importFiles(files);
      toast(`${n} file(s) imported into the local workspace.`, 'success');
    } catch {
      toast('Import failed. The files could not be read.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onZip = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const n = await importZip(file);
      toast(`ZIP imported: ${n} file(s) added to the local workspace.`, 'success');
    } catch {
      toast('Could not read that ZIP archive.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="empty-state">
        <div className="empty-icon">
          {busy ? <Loader2 size={26} className="spin" /> : <Globe size={26} />}
        </div>
        <h3>{title ?? 'Connect the RILOC website source'}</h3>
        <p>
          {message ??
            'Connect the website folder or import its files to browse, edit and export the RILOC source code. The expected folder is:'}
        </p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', display: 'inline-block' }}>
          {DEFAULT_SOURCE_PATH}
        </p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
          {fsSupported && (
            <Button onClick={doConnect} loading={busy} icon={<FolderOpen size={15} />}>
              Connect RILOC Website Folder
            </Button>
          )}
          <Button variant="secondary" onClick={() => dirRef.current?.click()} icon={<Upload size={15} />}>
            Import Files / Folder
          </Button>
          <Button variant="secondary" onClick={() => zipRef.current?.click()} icon={<FileArchive size={15} />}>
            Import ZIP Archive
          </Button>
        </div>
        {!fsSupported && (
          <p className="muted" style={{ marginTop: 12, maxWidth: 520, marginInline: 'auto' }}>
            This browser does not support the File System Access API, so a live folder connection is unavailable.
            Use file or ZIP import instead (works in every modern browser).
          </p>
        )}
      </div>
      <input
        ref={dirRef}
        type="file"
        multiple
        hidden
        {...({ webkitdirectory: '' } as Record<string, string>)}
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={zipRef}
        type="file"
        accept=".zip,application/zip"
        hidden
        onChange={(e) => {
          void onZip(e.target.files);
          e.target.value = '';
        }}
      />
    </Card>
  );
}
