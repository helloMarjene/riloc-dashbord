'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Replace, Search, X } from 'lucide-react';
import { highlight } from '@/lib/highlight';
import { LangId } from '@/lib/filetypes';

interface Props {
  path: string;
  defaultValue: string;
  language: LangId | null;
  onChange: (value: string) => void;
  // Programmatic value injection (undo/redo/revert). Bump `n` to apply.
  override?: { text: string; n: number };
}

// Lightweight code editor: transparent <textarea> over a syntax-highlighted
// <pre>. Kept uncontrolled on purpose so native undo/redo and caret behaviour
// stay intact; the highlighted layer simply mirrors the text.
export default function CodeEditor({ path, defaultValue, language, onChange, override }: Props) {
  const [text, setText] = useState(defaultValue);
  const [findOpen, setFindOpen] = useState(false);
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(defaultValue);
    setFindOpen(false);
    setFind('');
    setReplace('');
    setMatchIndex(0);
  }, [path, defaultValue]);

  const lastOverride = useRef(0);
  useEffect(() => {
    if (!override || override.n === lastOverride.current) return;
    lastOverride.current = override.n;
    setText(override.text);
    const ta = taRef.current;
    if (ta) {
      ta.value = override.text;
      ta.focus();
      ta.setSelectionRange(0, 0);
    }
    onChange(override.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override]);

  const html = useMemo(() => highlight(text, language) + '\n', [text, language]);
  const lineCount = useMemo(() => text.split('\n').length, [text]);
  const lines = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);

  const matches = useMemo(() => {
    if (!find) return [];
    const out: number[] = [];
    let idx = text.indexOf(find);
    while (idx !== -1 && out.length < 5000) {
      out.push(idx);
      idx = text.indexOf(find, idx + find.length);
    }
    return out;
  }, [text, find]);

  const syncScroll = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  }, []);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const value = e.currentTarget.value;
    setText(value);
    onChange(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = taRef.current;
    if (e.key === 'Tab' && ta) {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = text.slice(0, start) + '  ' + text.slice(end);
      setText(next);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setFindOpen(true);
      requestAnimationFrame(() => document.getElementById('editor-find-input')?.focus());
    }
  };

  useEffect(() => {
    if (!find || matches.length === 0) return;
    const clamped = Math.min(matchIndex, matches.length - 1);
    const ta = taRef.current;
    const pos = matches[clamped];
    if (ta) {
      ta.focus();
      ta.setSelectionRange(pos, pos + find.length);
      const lineH = 21;
      const before = text.slice(0, pos).split('\n').length - 1;
      ta.scrollTop = Math.max(0, before * lineH - ta.clientHeight / 2);
      syncScroll();
    }
  }, [matchIndex, matches, find, text, syncScroll]);

  useEffect(() => setMatchIndex(0), [find]);

  const doReplace = () => {
    if (!find) return;
    const pos = text.indexOf(find);
    if (pos === -1) return;
    const next = text.slice(0, pos) + replace + text.slice(pos + find.length);
    setText(next);
    onChange(next);
    setMatchIndex(0);
  };

  const doReplaceAll = () => {
    if (!find) return;
    const next = text.split(find).join(replace);
    const changed = next !== text;
    setText(next);
    onChange(next);
    setMatchIndex(0);
    if (changed) {
      const ta = taRef.current;
      requestAnimationFrame(() => ta?.focus());
    }
  };

  return (
    <div className="code-editor">
      {findOpen && (
        <div className="findbar">
          <div className="findbar-row">
            <Search size={14} className="findbar-icon" />
            <input
              id="editor-find-input"
              className="input findbar-input"
              placeholder="Find in file…"
              value={find}
              onChange={(e) => setFind(e.target.value)}
            />
            <span className="findbar-count">
              {find ? (matches.length ? `${Math.min(matchIndex + 1, matches.length)}/${matches.length}` : 'No results') : ''}
            </span>
            <button className="icon-btn" title="Previous match" onClick={() => setMatchIndex((i) => Math.max(0, i - 1))}>
              <ChevronUp size={15} />
            </button>
            <button className="icon-btn" title="Next match" onClick={() => setMatchIndex((i) => Math.min(Math.max(matches.length - 1, 0), i + 1))}>
              <ChevronDown size={15} />
            </button>
            <button className="icon-btn" title="Close (Esc)" onClick={() => setFindOpen(false)}>
              <X size={15} />
            </button>
          </div>
          <div className="findbar-row">
            <Replace size={14} className="findbar-icon" />
            <input
              className="input findbar-input"
              placeholder="Replace with…"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doReplace()}
            />
            <button className="btn btn-secondary btn-sm" onClick={doReplace}>
              Replace
            </button>
            <button className="btn btn-secondary btn-sm" onClick={doReplaceAll}>
              Replace All
            </button>
          </div>
        </div>
      )}
      <div className="code-editor-main">
        <div className="code-gutter" ref={gutterRef} aria-hidden>
          {lines.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
        <div className="code-area">
          <pre ref={preRef} className="code-highlight" aria-hidden>
            <code dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
          <textarea
            ref={taRef}
            className="code-input"
            value={text}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={`Source code of ${path}`}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
          />
          <button
            className="find-fab icon-btn"
            title="Find in file (Ctrl+F)"
            onClick={() => {
              setFindOpen(true);
              requestAnimationFrame(() => document.getElementById('editor-find-input')?.focus());
            }}
          >
            <Search size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
