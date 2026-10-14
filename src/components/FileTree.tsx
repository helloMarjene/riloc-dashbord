'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { FileNode } from '@/lib/types';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import FileIcon from './FileIcon';
import { formatBytes } from '@/lib/format';

interface Props {
  onSelect: (path: string) => void;
  selectedPath?: string | null;
}

function TreeNode({ node, depth, onSelect, selectedPath }: { node: FileNode; depth: number; onSelect: (p: string) => void; selectedPath?: string | null }) {
  const [open, setOpen] = useState(depth < 2);
  const { getStatus } = useWorkspace();
  const status = node.kind === 'file' ? getStatus(node.path) : null;

  if (node.kind === 'dir') {
    return (
      <div>
        <button className="tree-row" style={{ paddingLeft: 8 + depth * 14 }} onClick={() => setOpen(!open)} title={node.path}>
          {open ? <ChevronDown size={13} className="tree-caret" /> : <ChevronRight size={13} className="tree-caret" />}
          <FileIcon name={node.name} isDir open={open} size={15} />
          <span className="tree-name">{node.name}</span>
        </button>
        {open && node.children?.map((c) => <TreeNode key={c.path} node={c} depth={depth + 1} onSelect={onSelect} selectedPath={selectedPath} />)}
      </div>
    );
  }

  return (
    <button
      className={`tree-row tree-file ${selectedPath === node.path ? 'tree-active' : ''}`}
      style={{ paddingLeft: 8 + depth * 14 + 13 }}
      onClick={() => onSelect(node.path)}
      title={`${node.path}${node.size !== undefined ? ` — ${formatBytes(node.size)}` : ''}`}
    >
      <FileIcon name={node.name} size={15} />
      <span className="tree-name">{node.name}</span>
      {status === 'modified' && <span className="tree-dot tree-dot-modified" title="Modified locally" />}
      {status === 'saved-to-source' && <span className="tree-dot tree-dot-saved" title="Saved to source folder" />}
      {status === 'exported' && <span className="tree-dot tree-dot-exported" title="Exported" />}
    </button>
  );
}

export default function FileTree({ onSelect, selectedPath }: Props) {
  const { tree } = useWorkspace();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();
    const out: FileNode[] = [];
    const walk = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (n.kind === 'file' && (n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q))) out.push(n);
        if (n.children) walk(n.children);
      }
    };
    walk(tree);
    return out.slice(0, 50);
  }, [query, tree]);

  return (
    <div className="file-tree">
      <input
        className="input tree-search"
        placeholder="Search files…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search files"
      />
      <div className="tree-scroll">
        {results ? (
          results.length === 0 ? (
            <p className="tree-empty">No files match “{query}”.</p>
          ) : (
            results.map((f) => (
              <button key={f.path} className="tree-row tree-file" onClick={() => onSelect(f.path)} title={f.path}>
                <FileIcon name={f.name} size={15} />
                <span className="tree-name">{f.name}</span>
                <span className="tree-path">{f.path}</span>
              </button>
            ))
          )
        ) : tree.length === 0 ? (
          <p className="tree-empty">No files indexed yet.</p>
        ) : (
          tree.map((n) => <TreeNode key={n.path} node={n} depth={0} onSelect={onSelect} selectedPath={selectedPath} />)
        )}
      </div>
    </div>
  );
}
