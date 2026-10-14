// Lightweight regex-based syntax highlighter. Produces HTML with <span class="tok-*">
// tokens for the languages used by the RILOC website (HTML/CSS/JS) plus the other
// formats the dashboard can encounter (TS, JSON, MD, SVG, YAML, PHP).

import { LangId } from './filetypes';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface Rule {
  name: string;
  cls: string;
  src: string;
}

const STR = String.raw`"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\`(?:[^\`\\]|\\.)*\``;

const RULES: Record<LangId, Rule[]> = {
  js: [
    { name: 'comment', cls: 'tok-c', src: String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/` },
    { name: 'string', cls: 'tok-s', src: STR },
    { name: 'number', cls: 'tok-n', src: String.raw`\b0x[\da-fA-F]+\b|\b\d[\d_]*(?:\.\d+)?\b` },
    { name: 'keyword', cls: 'tok-k', src: String.raw`\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|this|null|undefined|true|false|typeof|instanceof|in|of|try|catch|finally|throw|async|await|import|export|from|default|delete|void|yield|static|get|set|implements|interface|type|enum|readonly|public|private|protected|namespace|declare|abstract|as|satisfies)\b` },
    { name: 'type', cls: 'tok-t2', src: String.raw`\b[A-Z][\w$]*\b` },
    { name: 'func', cls: 'tok-f', src: String.raw`\b[a-z_$][\w$]*(?=\s*\()` },
  ],
  ts: [],
  jsx: [],
  tsx: [],
  json: [
    { name: 'key', cls: 'tok-a', src: String.raw`"(?:[^"\\]|\\.)*"(?=\s*:)` },
    { name: 'string', cls: 'tok-s', src: STR },
    { name: 'number', cls: 'tok-n', src: String.raw`-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b` },
    { name: 'literal', cls: 'tok-k', src: String.raw`\b(?:true|false|null)\b` },
  ],
  css: [
    { name: 'comment', cls: 'tok-c', src: String.raw`\/\*[\s\S]*?\*\/` },
    { name: 'string', cls: 'tok-s', src: STR },
    { name: 'important', cls: 'tok-k', src: String.raw`!important\b` },
    { name: 'at', cls: 'tok-t2', src: String.raw`@[\w-]+` },
    { name: 'prop', cls: 'tok-a', src: String.raw`(?<=^|[;{}\s])[-a-zA-Z][-\w]*(?=\s*:)` },
    { name: 'color', cls: 'tok-n', src: String.raw`#[0-9a-fA-F]{3,8}\b` },
    { name: 'number', cls: 'tok-n', src: String.raw`\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch|ex|pt|pc)?\b` },
    { name: 'func', cls: 'tok-f', src: String.raw`\b[a-z-]+(?=\()` },
  ],
  html: [
    { name: 'comment', cls: 'tok-c', src: String.raw`<!--[\s\S]*?-->` },
    { name: 'doctype', cls: 'tok-c', src: String.raw`<!DOCTYPE[^>]*>` },
    { name: 'string', cls: 'tok-s', src: STR },
    { name: 'tag', cls: 'tok-t', src: String.raw`<\/?[a-zA-Z][\w-]*|\/>|>` },
    { name: 'attr', cls: 'tok-a', src: String.raw`[a-zA-Z_:][-\w:.]*(?==)` },
  ],
  svg: [],
  php: [
    { name: 'comment', cls: 'tok-c', src: String.raw`<!--[\s\S]*?-->|<\?php|\?>` },
    { name: 'string', cls: 'tok-s', src: STR },
    { name: 'tag', cls: 'tok-t', src: String.raw`<\/?[a-zA-Z][\w-]*` },
    { name: 'keyword', cls: 'tok-k', src: String.raw`\b(?:echo|function|return|if|else|foreach|as|while|class|public|private|protected|static|new|use|namespace|require|include|true|false|null)\b` },
  ],
  md: [
    { name: 'codeblock', cls: 'tok-s', src: '^```[\\s\\S]*?^```(?=\\n|$)' },
    { name: 'heading', cls: 'tok-t', src: String.raw`^#{1,6}[^\n]*` },
    { name: 'quote', cls: 'tok-c', src: String.raw`^>[^\n]*` },
    { name: 'inline', cls: 'tok-s', src: '`[^`\\n]+`' },
    { name: 'bold', cls: 'tok-k', src: String.raw`\*\*[^*\n]+\*\*|__[^_\n]+__` },
    { name: 'link', cls: 'tok-a', src: String.raw`\[[^\]\n]*\]\([^)\n]*\)` },
  ],
  yml: [
    { name: 'comment', cls: 'tok-c', src: String.raw`#[^\n]*` },
    { name: 'key', cls: 'tok-a', src: String.raw`^[\t ]*[\w.-]+(?=\s*:)` },
    { name: 'string', cls: 'tok-s', src: STR },
    { name: 'number', cls: 'tok-n', src: String.raw`\b\d+(?:\.\d+)?\b` },
    { name: 'literal', cls: 'tok-k', src: String.raw`\b(?:true|false|null|yes|no)\b` },
  ],
  txt: [],
};

RULES.ts = RULES.js;
RULES.jsx = RULES.js;
RULES.tsx = RULES.js;
RULES.svg = RULES.html;

const masterCache = new Map<LangId, RegExp | null>();

function masterFor(lang: LangId): RegExp | null {
  if (masterCache.has(lang)) return masterCache.get(lang) ?? null;
  const rules = RULES[lang];
  if (!rules || rules.length === 0) {
    masterCache.set(lang, null);
    return null;
  }
  const src = rules.map((r) => `(?<${r.name}>${r.src})`).join('|');
  let re: RegExp | null = null;
  try {
    re = new RegExp(src, 'gm');
  } catch {
    re = null;
  }
  masterCache.set(lang, re);
  return re;
}

export function highlight(code: string, lang: LangId | null): string {
  if (!lang) return escapeHtml(code);
  const re = masterFor(lang);
  if (!re) return escapeHtml(code);
  const clsFor = new Map(RULES[lang].map((r) => [r.name, r.cls]));
  let out = '';
  let last = 0;
  for (const m of code.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out += escapeHtml(code.slice(last, idx));
    let cls: string | undefined;
    const groups = (m as unknown as { groups?: Record<string, string | undefined> }).groups;
    if (groups) {
      for (const [name, val] of Object.entries(groups)) {
        if (val !== undefined) {
          cls = clsFor.get(name);
          break;
        }
      }
    }
    out += cls ? `<span class="${cls}">${escapeHtml(m[0])}</span>` : escapeHtml(m[0]);
    last = idx + m[0].length;
  }
  if (last < code.length) out += escapeHtml(code.slice(last));
  return out;
}
