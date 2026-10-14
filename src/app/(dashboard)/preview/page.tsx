'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, ExternalLink, FileCode2, Globe, Info, MonitorPlay, PackageOpen } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/contexts/ToastContext';
import { Button, Card } from '@/components/ui';
import ConnectPanel from '@/components/ConnectPanel';
import { buildPreviewDoc } from '@/lib/htmlTools';
import { DEFAULT_SOURCE_PATH, LIVE_URL } from '@/lib/constants';

function PreviewInner() {
  const params = useSearchParams();
  const ws = useWorkspace();
  const { toast } = useToast();
  const [file, setFile] = useState<string | null>(null);
  const [doc, setDoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const htmlFiles = useMemo(() => {
    const out: string[] = [];
    const walk = (nodes: typeof ws.tree) => {
      for (const n of nodes) {
        if (n.kind === 'file' && n.name.toLowerCase().endsWith('.html')) out.push(n.path);
        if (n.children) walk(n.children);
      }
    };
    walk(ws.tree);
    return out.sort();
  }, [ws.tree]);

  useEffect(() => {
    const fromUrl = params.get('file');
    if (fromUrl && ws.indexed && !file) setFile(fromUrl);
    else if (!file && htmlFiles.length > 0) setFile(htmlFiles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, ws.indexed, htmlFiles]);

  useEffect(() => {
    if (!file || !ws.indexed) {
      setDoc(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    ws.readContent(file)
      .then((content) => {
        if (!cancelled) setDoc(buildPreviewDoc(content, LIVE_URL + '/'));
      })
      .catch(() => !cancelled && setDoc(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, ws.indexed, ws.drafts]);

  if (!ws.indexed) {
    return (
      <div className="stack">
        <ConnectPanel title="Preview the RILOC website" message="Connect or import the website source to preview real pages locally." />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="grid-2">
        <Card title="Where to preview">
          <div className="stack-sm">
            <div className="row">
              <Button size="sm" icon={<ExternalLink size={14} />} onClick={() => window.open(LIVE_URL, '_blank', 'noopener')}>
                Open Live Website
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<Copy size={14} />}
                onClick={() => {
                  void navigator.clipboard?.writeText(DEFAULT_SOURCE_PATH).then(() => toast('Local folder path copied. Open index.html from that folder in your browser.', 'success'));
                }}
              >
                Open Local Website (copy folder path)
              </Button>
            </div>
            <p className="muted">
              “Open Local Website” copies the path of the website folder. Open <code>index.html</code> inside it with your
              browser to view the unmodified site straight from disk. The dashboard cannot launch local files itself.
            </p>
          </div>
        </Card>
        <Card title="How local preview works">
          <div className="notice notice-info">
            <Info size={16} />
            <p>
              The frame below renders the selected HTML file in an isolated sandbox. Relative assets (CSS, images, JS)
              are loaded from the <strong>live</strong> {LIVE_URL} site, so locally edited images are not reflected unless
              you export the workspace and serve it. Scripts run in a sandboxed context.
            </p>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <Button size="sm" variant="secondary" icon={<PackageOpen size={14} />} onClick={() => void ws.exportWorkspace()}>
              Export Website Workspace (ZIP)
            </Button>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            To preview exported changes exactly as they will behave: unzip the export anywhere and serve the folder
            (e.g. <code>npx serve</code> or VS Code Live Server), then open <code>index.html</code>.
          </p>
        </Card>
      </div>

      <Card
        title="Sandboxed Page Preview"
        actions={
          <div className="row" style={{ gap: 8 }}>
            <Globe size={14} className="muted" />
            <select className="input" style={{ width: 'auto', minWidth: 220 }} value={file ?? ''} onChange={(e) => setFile(e.target.value)} aria-label="Select HTML file to preview">
              {htmlFiles.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            {file && (
              <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <FileCode2 size={13} />
                {ws.getStatus(file) === 'modified' ? 'Showing local edits' : 'Showing source version'}
              </span>
            )}
          </div>
        }
      >
        <div className="preview-shell" style={{ height: '56vh' }}>
          <div className="preview-frame-wrap">
            {loading ? (
              <p className="muted" style={{ alignSelf: 'center', margin: 'auto' }}>
                Preparing preview…
              </p>
            ) : doc ? (
              <iframe
                title={`Preview of ${file}`}
                className="preview-frame"
                sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                srcDoc={doc}
              />
            ) : (
              <p className="muted" style={{ alignSelf: 'center', margin: 'auto' }}>
                Select an HTML file to preview it.
              </p>
            )}
          </div>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          <MonitorPlay size={12} style={{ verticalAlign: -2 }} /> This preview is local only. It does not update, publish
          to, or verify the live website in any way.
        </p>
      </Card>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={null}>
      <PreviewInner />
    </Suspense>
  );
}
