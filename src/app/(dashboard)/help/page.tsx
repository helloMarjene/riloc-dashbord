'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { LIVE_URL, DEFAULT_SOURCE_PATH } from '@/lib/constants';

const TOPICS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: 'How do I connect the RILOC source directory?',
    a: (
      <>
        <p>
          Open <strong>Website Manager</strong> (or the Source Code Editor) and click <strong>“Connect RILOC Website Folder”</strong>.
          Your browser will ask you to pick a folder — select:
        </p>
        <p><code>{DEFAULT_SOURCE_PATH}</code></p>
        <p>
          The dashboard can only read and write that folder after you grant permission. If your browser does not support
          the File System Access API (e.g. Firefox), use <strong>Import Files</strong> or <strong>Import ZIP</strong> instead —
          everything except writing back to disk works the same way.
        </p>
      </>
    ),
  },
  {
    q: 'How do I open and edit source files?',
    a: (
      <>
        <p>In the <strong>Source Code Editor</strong>, click any file in the directory tree on the left. It opens in a tab
        with syntax highlighting, line numbers, and find/replace (Ctrl+F). Type your changes — they are kept as a local
        draft automatically, so you can refresh the page without losing work.</p>
        <p>HTML, CSS and JavaScript (the languages the RILOC website uses) are fully highlighted, along with TypeScript,
        JSON, Markdown, SVG, YAML and PHP if they ever appear in the project.</p>
      </>
    ),
  },
  {
    q: 'How do I save files?',
    a: (
      <>
        <p>Click <strong>Save</strong> in the editor toolbar:</p>
        <ol>
          <li>If a folder is connected and write permission is granted, the file is written back into the website folder.</li>
          <li>Otherwise the change stays in the dashboard’s local workspace (browser storage) and is marked “Modified Locally”.</li>
          <li><strong>Revert File</strong> discards your local changes and restores the original content.</li>
        </ol>
        <p>If a file was changed on disk by another program since you opened it, the dashboard warns you before
        overwriting.</p>
      </>
    ),
  },
  {
    q: 'How do I export modified files?',
    a: (
      <>
        <p>Click <strong>“Export Modified (n)”</strong> in the editor toolbar to download a ZIP containing only the files you
        changed (original folder structure preserved). To export the entire website with your edits applied, use
        <strong>“Export Website ZIP”</strong> on the Website Manager page.</p>
        <p>Sensitive files (node_modules, .git, .env files, private keys) are excluded and the dashboard tells you exactly
        what was left out.</p>
      </>
    ),
  },
  {
    q: 'How do I deploy changes to the live website?',
    a: (
      <>
        <p>This dashboard <strong>never</strong> publishes anything. To make local changes live:</p>
        <ol>
          <li>Export the modified files (or the full workspace) as a ZIP.</li>
          <li>Extract it and confirm the changed files look right (you can preview the exported folder with any static server, e.g. <code>npx serve</code>).</li>
          <li>Upload the changed files to your hosting (for example via the host’s file manager, FTP, or Git deployment) — or hand them to your developer/host.</li>
        </ol>
      </>
    ),
  },
  {
    q: 'Why doesn’t editing here update the live website automatically?',
    a: (
      <p>
        The live site at <a href={LIVE_URL} target="_blank" rel="noreferrer">{LIVE_URL}</a> is served by your hosting provider.
        A browser-based dashboard has no access to your hosting account, so it can only prepare files for you. Publishing
        always requires a separate, deliberate step on the hosting side. Anything claiming otherwise would be a fabrication.
      </p>
    ),
  },
  {
    q: 'How does local browser storage work?',
    a: (
      <>
        <p>Small settings (theme, name, domain contacts, activity history, credentials) live in <strong>localStorage</strong>.
        Larger data — editor drafts, imported files, your profile picture — lives in <strong>IndexedDB</strong>. The connected
        folder handle is stored in IndexedDB too, so reconnecting is one click (browsers may still ask permission again).</p>
        <p>Everything is stored <strong>on this device, in this browser only</strong>. It is not synced between devices and does
        not survive clearing browser storage. Use <strong>Settings → Data Management → Export</strong> for backups.</p>
      </>
    ),
  },
  {
    q: 'How do I back up my settings?',
    a: (
      <p>Go to <strong>Settings → Data Management → Export Dashboard Settings (JSON)</strong> and keep the downloaded file safe.
      To restore, use <strong>Import Settings</strong> — the file is validated first, and invalid files are rejected. The fixed
      domain dates, status and protection values are never changed by an import.</p>
    ),
  },
  {
    q: 'How do I change the administrator password?',
    a: (
      <p>Go to <strong>Settings → Security → Change Password</strong>. Enter the current password, then a new password of at
      least 6 characters, and confirm it. The new password is stored in this browser and applies to future sign-ins.
      “Reset Login Credentials” restores the defaults (<code>karungo@gmail.com</code> / <code>riloc2026</code>).</p>
    ),
  },
  {
    q: 'Why is client-side authentication not secure for a public dashboard?',
    a: (
      <p>
        Because the login check runs entirely in browser code, anyone who can open the dashboard files on a device can
        read or bypass the check in seconds. It is fine as a personal, local convenience — but never expose this
        dashboard to the internet expecting the password to keep attackers out. For a public production dashboard you
        need server-side authentication.
      </p>
    ),
  },
  {
    q: 'What does the “RILOC SSL CERTIFICATE” document represent?',
    a: (
      <p>
        It is an <strong>informational certificate-style document</strong>: a tidy summary of the protection details the
        administrator supplied (HTTPS, Cloudflare). It is not issued by a certificate authority and contains no real
        serial number, fingerprint or verified expiry date. The real certificate is the one served by the live website —
        view it in your browser via the padlock icon.
      </p>
    ),
  },
  {
    q: 'Why are domain registration validity and SSL validity different?',
    a: (
      <p>
        Domain registration is about owning the name <code>www.rilocs.org</code> (registrar: Namecheap, validity
        1 Sep 2026 – 1 Sep 2028). An SSL/TLS certificate is a separate cryptographic file that encrypts traffic and is
        issued/renewed on its own schedule — often every few months. The dashboard deliberately never shows the
        registration dates as certificate dates, because they are not the same thing.
      </p>
    ),
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number>(0);

  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <div className="page-head">
        <div>
          <h2>Help and Information</h2>
          <p>Plain-language answers about using this dashboard and about what it can — and cannot — do.</p>
        </div>
      </div>

      {TOPICS.map((t, i) => (
        <div className="help-item" key={i}>
          <button className="help-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <HelpCircle size={16} style={{ color: 'var(--primary)' }} />
              {t.q}
            </span>
            <ChevronDown size={16} style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {open === i && <div className="help-a">{t.a}</div>}
        </div>
      ))}

      <div className="notice notice-info">
        <HelpCircle size={16} />
        <p>
          Still stuck? The important mental model: this dashboard is a <strong>local editing workbench</strong> for the RILOC
          website files. It prepares, organises and exports changes — the actual publishing step always happens on your
          hosting platform.
        </p>
      </div>
    </div>
  );
}
