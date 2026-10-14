// Parses real HTML source files from the RILOC workspace and exposes a small
// set of editable text fields (title, meta description, hero text, buttons).
// Every field is a concrete selector applied to the actual document, so saving
// a field writes a genuinely modified source file into the local workspace.

import { PageField } from './types';

export interface PageFieldValue extends PageField {
  value: string;
}

export interface ParsedPage {
  fileName: string;
  title: string;
  route: string;
  fields: PageFieldValue[];
}

export function routeForFile(fileName: string): string {
  if (fileName === 'index.html') return '/';
  return `/${fileName}`;
}

const SELECTOR_FIELDS: Array<PageField & { anyPage?: boolean }> = [
  { key: 'hero-eyebrow', label: 'Hero Eyebrow (small label above the heading)', kind: 'selector', selector: '.hero .eyebrow, header .eyebrow, .page-hero .eyebrow, .eyebrow', index: 0, attr: 'text', anyPage: true },
  { key: 'hero-h1', label: 'Main Page Heading (H1)', kind: 'selector', selector: '.hero h1, header h1, h1', index: 0, attr: 'text', anyPage: true },
  { key: 'hero-para', label: 'Hero Introduction Paragraph', kind: 'selector', selector: '.hero p, header p', index: 0, attr: 'text', anyPage: true },
  { key: 'cta-primary', label: 'Primary Button Text', kind: 'selector', selector: '.hero .btn-primary, header .btn-primary, .btn-primary', index: 0, attr: 'text', anyPage: true },
  { key: 'footer-about', label: 'Footer Organisation Description', kind: 'selector', selector: '.footer p, footer p', index: 0, attr: 'text', anyPage: true },
  { key: 'footer-copy', label: 'Footer Copyright Line', kind: 'selector', selector: '.footer-bottom span, footer .footer-bottom span', index: 0, attr: 'text', anyPage: true },
];

function setField(doc: Document, field: PageField, value: string): boolean {
  if (field.kind === 'title') {
    doc.title = value;
    return true;
  }
  if (field.kind === 'meta') {
    const meta = doc.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', value);
      return true;
    }
    const head = doc.querySelector('head');
    if (head) {
      const el = doc.createElement('meta');
      el.setAttribute('name', 'description');
      el.setAttribute('content', value);
      head.appendChild(el);
      return true;
    }
    return false;
  }
  if (field.kind === 'selector' && field.selector) {
    const nodes = doc.querySelectorAll(field.selector);
    const node = nodes[field.index ?? 0];
    if (!node) return false;
    if (field.attr === 'content') node.setAttribute('content', value);
    else node.textContent = value;
    return true;
  }
  return false;
}

function getField(doc: Document, field: PageField): string | null {
  if (field.kind === 'title') return doc.title;
  if (field.kind === 'meta') return doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
  if (field.kind === 'selector' && field.selector) {
    const nodes = doc.querySelectorAll(field.selector);
    const node = nodes[field.index ?? 0];
    if (!node) return null;
    return field.attr === 'content' ? node.getAttribute('content') : node.textContent;
  }
  return null;
}

export function parsePage(fileName: string, html: string): ParsedPage {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const fields: PageFieldValue[] = [
    { key: 'title', label: 'Page Title (browser tab)', kind: 'title', value: doc.title },
    {
      key: 'meta',
      label: 'Meta Description (search engines)',
      kind: 'meta',
      value: doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    },
  ];
  for (const f of SELECTOR_FIELDS) {
    const value = getField(doc, f);
    if (value !== null && value.trim() !== '') {
      fields.push({ ...f, value: value.trim() });
    }
  }
  return { fileName, title: doc.title || fileName, route: routeForFile(fileName), fields };
}

export function applyField(html: string, field: PageField, value: string): { html: string; applied: boolean } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const applied = setField(doc, field, value);
  if (!applied) return { html, applied: false };
  return { html: '<!DOCTYPE html>\n' + doc.documentElement.outerHTML, applied: true };
}

// Inject <base href> so a standalone HTML preview can resolve relative assets
// (images/css/js) against the live RILOC website.
export function buildPreviewDoc(html: string, baseUrl: string): string {
  if (/<base[\s>]/i.test(html)) return html;
  return html.replace(/<head([^>]*)>/i, `<head$1>\n<base href="${baseUrl}" target="_self">`);
}
