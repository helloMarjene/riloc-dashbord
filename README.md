# RILOC Admin Dashboard

A complete, client-side-only administration dashboard for the RILOC website
([www.rilocs.org](https://www.rilocs.org)). It provides a professional interface for
browsing, editing, saving and exporting the actual RILOC website source files — with no
backend, no database and no server-side code of any kind.

Built for **RILOC — Refugee & Immigrant-Led Organizations Coalition**.

---

## 1. Project Overview

The RILOC website source is a static HTML/CSS/JS site located at
`C:\Users\ADMIN\Desktop\RILOC-SUMMARY\RILOCS-MAIN` (4 pages: index, about, portfolio,
contact; one stylesheet; one script; ~20 images). This dashboard wraps that real source
code in a website-management workbench:

- **Overview** — live stats computed from the actual indexed files (pages, source files,
  modified files, media assets, pending exports), quick actions and recent activity.
- **Website Manager** — connection control, technology detection, and the full file
  explorer + editor + export workflow.
- **Source Code Editor** — directory tree, multi-tab editor with syntax highlighting, line
  numbers, find/replace, undo/redo, save/save-all, revert, preview and export, plus a file
  details panel with an original-vs-modified comparison.
- **Pages and Content** — discovers the real HTML pages, lets you edit page text (title,
  meta description, hero heading/paragraph, buttons, footer text) directly into the source
  as a local draft, or open the raw source.
- **Media Library** — grid/list browser for the real website images with preview, search,
  import, download and ZIP export.
- **Website Preview** — sandboxed iframe previews of real HTML pages (assets resolved from
  the live site), plus buttons and guidance for opening the live site and exported copies.
- **Domain Information Centre** — the administrator-supplied domain record
  (www.rilocs.org, Namecheap, 2026-09-01 → 2028-09-01, Cloudflare protection) with fully
  editable contact cards and a live-computed validity countdown.
- **RILOC SSL CERTIFICATE** — a clearly-labelled **informational** certificate-style
  document (print + download).
- **Admin Profile** — name and picture used everywhere in the UI, persisted locally.
- **Activity History** — every real local action, searchable and exportable.
- **Settings** — general, administrator, security (password change), workspace and data
  management sections.
- **Help and Information** — beginner-friendly guidance for the whole workflow.

## 2. Technologies Used

- **Next.js 14** (App Router) + **React 18** + **TypeScript** — the app is fully
  client-side (`'use client'`); there are **no API routes and no server actions**.
- **Lucide React** — all interface icons.
- **JSZip** — ZIP import/export.
- **File System Access API** (Chromium/Edge) — optional direct read/write of the website
  folder, only after explicit permission.
- **localStorage** — small persistent settings (theme, profile, domain contacts,
  credentials hash, activity history).
- **IndexedDB** — editor drafts, imported file contents, custom avatar, and the stored
  directory handle.
- **Custom code editor** — a dependency-free textarea + highlighted-overlay editor with
  regex-based syntax highlighting for HTML, CSS, JS, TS, JSON, Markdown, SVG, YAML and
  PHP (chosen over Monaco so the editor works fully offline with zero worker setup).
- Custom **file-type icons** (inline SVG, incl. HTML5/CSS3/JS/TS/React/PHP-style logos)
  used in the tree, tabs, search results and details panel.

## 3. Installation

```bash
cd C:\Users\ADMIN\Desktop\RILOC-SUMMARY\RILOC-DASHBORD
npm install
```

Requires **Node.js 18.17+** (developed on Node 24).

## 4. Running the Application

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

**Default login:** `karungo@gmail.com` / `riloc2026` (changeable in Settings → Security).

## 5. Production Build

```bash
npm run build
npm start
```

## 6. Project Structure

```
RILOC-DASHBORD/
├─ public/assets/            # RILOC logo + default administrator photo
├─ src/
│  ├─ app/                   # App Router pages
│  │  ├─ login/              # client-side sign-in
│  │  └─ (dashboard)/        # the 12 protected sections
│  │     ├─ overview/  website-manager/  editor/  pages/
│  │     ├─ media/  preview/  domain/  ssl/  profile/
│  │     └─ activity/  settings/  help/
│  ├─ components/            # shell, sidebar, topbar, editor, tree, ui primitives…
│  └─ lib/ + contexts/       # types, storage, IndexedDB, FS-Access, highlighting,
│                            # auth/settings/workspace/activity/toast contexts
└─ next.config.mjs, tsconfig.json, package.json
```

## 7. Connecting the RILOC Website Folder

1. Open **Website Manager** (or the Source Code Editor).
2. Click **“Connect RILOC Website Folder”**.
3. Select `C:\Users\ADMIN\Desktop\RILOC-SUMMARY\RILOCS-MAIN` and allow read/write access.

Browsers hide absolute paths from web pages for security — the dashboard can only see the
folder you pick. In **Firefox** (no File System Access API), use **Import Files** or
**Import ZIP** instead; everything works except writing back to disk.

The original website directory is **never modified automatically** — only explicit Saves
write to it, and only after permission.

## 8. How Source Editing Works

- Files are indexed by walking the connected folder (or imported archive).
- Opening a file shows it in a tabbed editor with per-language syntax highlighting,
  line numbers, find/replace (Ctrl+F), indentation support and unsaved-change indicators.
- Edits are stored as **local drafts** (IndexedDB) immediately — refresh-safe.
- **Save** writes back to the website folder when connected and permitted; otherwise the
  draft stays local. If the on-disk file changed since you opened it, you get a warning
  before overwriting.
- **Revert File** restores the original content.
- Status labels are truthful: *Original File*, *Modified Locally / Pending Export*,
  *Saved to Source Folder*, *Exported*.

## 9. Saving and Exporting Files

- **Export Modified Files** — ZIP of only your changed files, relative paths preserved.
- **Export Website ZIP** — the full workspace with your edits applied.
- Excluded automatically (with a visible warning): `node_modules`, `.git`, `.env*`,
  private keys, certificates-with-keys, credentials.
- **Nothing is ever published.** Deploy by extracting the export and uploading the files
  to your host, or handing them to your developer.

## 10. Administrator Settings

Name, profile picture (JPEG/PNG/WEBP/GIF/SVG ≤ 5 MB) and contact email are editable under
**Admin Profile** / **Settings → Administrator** and appear instantly across the sidebar,
top bar and login-adjacent UI. “Reset to Defaults” restores ARSENE KAHUNGA + the default
photo.

## 11. Domain Information Storage

The domain record (`www.rilocs.org`, registrar, four contact roles) ships with the
administrator-supplied values. Contact cards and the registrar name are **editable and
stored in localStorage**. Registration dates (1 Sep 2026 – 1 Sep 2028), domain status
(Active) and Cloudflare protection are **fixed configuration values** — viewable and
copyable, but not editable, and never modified by settings imports. The remaining-days
count is computed from the browser’s current date. The dashboard never contacts Namecheap
or Cloudflare.

## 12. How the Informational Certificate Works

The **RILOC SSL CERTIFICATE** page renders a certificate-style summary of
administrator-supplied protection information, clearly labelled **INFORMATIONAL
DOCUMENT**. It deliberately contains no certificate authority, serial number, TLS
fingerprint or verified expiry date, and it never uses the domain registration dates as
certificate dates. It can be printed (print stylesheet included) or downloaded as a
standalone HTML file.

## 13. Browser Compatibility

| Feature | Chrome/Edge | Firefox | Safari |
|---|---|---|---|
| Dashboard, storage, editor, ZIP | ✅ | ✅ | ✅ |
| Connect website folder (read/write) | ✅ | ❌ (use import) | ❌ (use import) |

## 14. Known Limitations

- No live analytics/traffic/uptime data is shown (none exists client-side; none is faked).
- “Website status: Active” is a **configured label**, not an availability probe.
- Sandboxed previews load relative assets from the live site; locally edited images appear
  only after exporting and serving the workspace.
- Browsers cannot open Windows Explorer or launch local files directly — the dashboard
  copies paths instead.
- Local data is per-browser and per-device; clearing browser storage erases it.

## 15. Authentication Security Limitations

The login is a **client-side demonstration**: the credential check runs in browser code
and a SHA-256 hash of the password is stored in localStorage. Anyone with device access
can inspect or bypass it. Do **not** expose this dashboard publicly and rely on the login
to protect sensitive operations — use server-side authentication for that.

## 16. Preparing Changes for Deployment

1. Finish edits → **Export Modified Files** (or **Export Website ZIP**).
2. Extract the ZIP and preview locally (e.g. `npx serve`) to confirm.
3. Upload the changed files to the hosting provider for **www.rilocs.org**.
4. Verify the live site in a browser.

---

*Dashboard built for RILOC administration. The RILOC website source in `RILOCS-MAIN`
remains the property of RILOC and is preserved untouched by this project.*
