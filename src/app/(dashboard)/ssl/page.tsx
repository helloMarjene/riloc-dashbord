'use client';

import React, { useMemo } from 'react';
import { Download, Info, Printer, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import { useActivity } from '@/contexts/ActivityContext';
import { useToast } from '@/contexts/ToastContext';
import { DEFAULT_DOMAIN } from '@/lib/constants';
import { downloadText } from '@/lib/format';

export default function SslPage() {
  const { log } = useActivity();
  const { toast } = useToast();

  const reference = useMemo(() => {
    // Stable document reference derived from the fixed domain + creation date.
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `RILOC-INFO-${DEFAULT_DOMAIN.domain.replace(/\./g, '-').toUpperCase()}-${day}`;
  }, []);

  const created = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    []
  );

  const print = () => {
    log('Informational certificate printed', 'SSL Certificate', 'success');
    window.print();
  };

  const download = () => {
    const markup = document.getElementById('riloc-cert-doc')?.outerHTML ?? '';
    const full = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>RILOC SSL CERTIFICATE — ${DEFAULT_DOMAIN.domain}</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;background:#fdf9f0;margin:0;padding:40px;display:grid;place-items:center}
.cert-doc{background:#fffdf8;border:2px solid #0f3d63;outline:6px double #E8833A;outline-offset:-14px;padding:46px 52px;max-width:860px;color:#22303c}
.cert-head{display:flex;gap:16px;align-items:center;border-bottom:2px solid #0f3d63;padding-bottom:16px;margin-bottom:20px}
.cert-head img{width:64px;height:64px;object-fit:contain}
.cert-head h2{margin:0;color:#0f3d63;font-size:24px;letter-spacing:1px}
.cert-head p{margin:0;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:#5a6b7d}
.cert-banner{display:inline-block;background:#0f3d63;color:#ffd9b3;font-size:11px;font-weight:800;letter-spacing:2px;padding:5px 14px;border-radius:4px;margin-bottom:16px}
.cert-domain{font-size:26px;font-weight:800;color:#0f3d63;margin:4px 0 14px}
.cert-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;margin:14px 0 18px}
.cert-row{display:flex;justify-content:space-between;gap:14px;font-size:12.8px;border-bottom:1px dotted #b9c4ce;padding:6px 0}
.cert-row span{color:#5a6b7d}.cert-row strong{color:#16283c;text-align:right}
.cert-note{font-size:11.8px;color:#5a6b7d;border-top:1px solid #d5dce3;padding-top:12px;margin-top:14px}
.cert-foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px}
.cert-sign{text-align:center}.cert-sign .sig-line{border-top:1px solid #22303c;padding-top:5px;font-size:11.5px;color:#5a6b7d;min-width:200px}
.cert-seal{width:92px;height:92px;border:3px double #E8833A;border-radius:50%;display:grid;place-items:center;text-align:center;font-size:10px;font-weight:800;letter-spacing:1px;color:#d6702a;transform:rotate(-8deg)}
</style></head><body>
${markup}
</body></html>`;
    downloadText(full, `RILOC-SSL-CERTIFICATE-${DEFAULT_DOMAIN.domain}.html`, 'text/html');
    log('Informational certificate downloaded', 'SSL Certificate', 'success');
    toast('Certificate document downloaded as HTML (open it and use Print → PDF).', 'success');
  };

  return (
    <div className="cert-wrap">
      <div className="notice notice-warning no-print">
        <Info size={16} />
        <p>
          This document summarizes administrator-supplied website protection information. It is an{' '}
          <strong>informational document</strong> — not an issued SSL/TLS certificate — and does not replace the
          certificate presented by the live website. No certificate authority, serial number, fingerprint or verified
          expiry date is claimed.
        </p>
      </div>

      <div className="row no-print">
        <Button size="sm" icon={<Printer size={14} />} onClick={print}>
          Print Certificate
        </Button>
        <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={download}>
          Download Certificate
        </Button>
        <span className="muted">Printing from the downloaded HTML file produces the cleanest PDF.</span>
      </div>

      <div className="cert-doc" id="riloc-cert-doc">
        <div className="cert-head">
          <img src="/assets/riloc-logo.png" alt="RILOC logo" />
          <div>
            <h2>RILOC SSL CERTIFICATE</h2>
            <p>Website Protection Summary</p>
          </div>
        </div>

        <span className="cert-banner">INFORMATIONAL DOCUMENT</span>

        <p style={{ color: '#5a6b7d', fontSize: 13 }}>
          This certificate-style document summarises the protection configuration of the RILOC website as supplied by
          the site administrator.
        </p>

        <div className="cert-domain">{DEFAULT_DOMAIN.domain}</div>

        <div className="cert-grid">
          <div className="cert-row"><span>Document title</span><strong>RILOC SSL CERTIFICATE</strong></div>
          <div className="cert-row"><span>Protected host</span><strong>{DEFAULT_DOMAIN.domain}</strong></div>
          <div className="cert-row"><span>Purpose</span><strong>Website protection summary</strong></div>
          <div className="cert-row">
            <span>Protection</span>
            <strong>HTTPS website · Cloudflare protection (administrator-supplied)</strong>
          </div>
          <div className="cert-row"><span>Document created</span><strong>{created}</strong></div>
          <div className="cert-row"><span>Reference</span><strong>{reference}</strong></div>
          <div className="cert-row"><span>Status</span><strong>Informational — active configuration</strong></div>
          <div className="cert-row"><span>Issued by</span><strong>RILOC administration (self-declared)</strong></div>
        </div>

        <p style={{ fontSize: 12.8, color: '#22303c' }}>
          The live website is served over HTTPS and is presented as protected by Cloudflare according to the
          administrator’s configuration records. Domain registration validity (1 September 2026 – 1 September 2028) is
          shown in the Domain Information Centre and is <strong>not</strong> an SSL/TLS certificate validity period.
        </p>

        <p className="cert-note">
          This document is not a cryptographically issued certificate. It contains no certificate authority
          attestation, no serial number, no TLS fingerprint and no verified expiry date, and it must not be used as
          proof of security configuration. The authoritative certificate is the one served by the live website and
          visible via the browser’s padlock / certificate viewer.
        </p>

        <div className="cert-foot">
          <div className="cert-sign">
            <p style={{ fontSize: 12, color: '#5a6b7d' }}>Administrator</p>
            <div className="sig-line">Arsene Kahunga · RILOC Website Administration</div>
          </div>
          <div className="cert-seal">
            RILOC
            <br />
            INFORMATIONAL
            <br />
            DOCUMENT
          </div>
        </div>
      </div>

      <Card title="About this document" className="no-print">
        <div className="stack-sm">
          <div className="row">
            <Badge tone="info">INFORMATIONAL DOCUMENT</Badge>
            <Badge tone="neutral">No CA claimed</Badge>
            <Badge tone="neutral">No serial number</Badge>
            <Badge tone="neutral">No TLS fingerprint</Badge>
          </div>
          <p>
            Domain registration validity and SSL/TLS certificate validity are different things: the first concerns the
            domain name registration with the registrar; the second concerns the cryptographic certificate served by
            the website. The registration dates shown in this dashboard are registration dates and are deliberately not
            used here as certificate dates.
          </p>
          <p className="muted">
            To inspect the real certificate presented by the live website, open{' '}
            <a href={`https://${DEFAULT_DOMAIN.domain}`} target="_blank" rel="noreferrer">{DEFAULT_DOMAIN.domain}</a>{' '}
            in your browser, click the padlock icon, and view “Connection is secure → Certificate is valid”.
          </p>
        </div>
      </Card>
    </div>
  );
}
