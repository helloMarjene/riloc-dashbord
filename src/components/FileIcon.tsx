import React from 'react';
import { fileTypeInfo } from '@/lib/filetypes';

// Recognizable technology/file-type icons rendered as inline SVG.
// Used in the directory tree, editor tabs, search results and detail panels.

interface Props {
  name: string;
  size?: number;
  isDir?: boolean;
  open?: boolean;
}

function Svg({ size, children, title }: { size: number; children: React.ReactNode; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={title} style={{ flexShrink: 0 }}>
      {children}
    </svg>
  );
}

const FolderIcon: React.FC<{ size: number; open?: boolean }> = ({ size, open }) => (
  <Svg size={size} title="Folder">
    <path
      d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V6z"
      fill={open ? '#F5C662' : '#E8A33D'}
    />
    <path d="M3 9h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" fill={open ? '#FBD97F' : '#F5C662'} />
  </Svg>
);

const ICONS: Record<string, React.FC<{ size: number }>> = {
  html: ({ size }) => (
    <Svg size={size} title="HTML5">
      <path d="M4 3h16l-1.5 17L12 22l-6.5-2L4 3z" fill="#E34F26" />
      <path d="M12 4.5h6l-.9 10-5.1 1.7v-3l3-.9.3-3.8H12v-4z" fill="#fff" opacity=".9" />
      <path d="M12 8.5v4l-3-.9-.2-3.1H12z" fill="#fff" opacity=".7" />
    </Svg>
  ),
  css: ({ size }) => (
    <Svg size={size} title="CSS3">
      <path d="M4 3h16l-1.5 17L12 22l-6.5-2L4 3z" fill="#1572B6" />
      <path d="M12 4.5h6l-.5 5.5H12v-2.7h3l.2-2.8H12v-2z" fill="#fff" opacity=".9" />
      <path d="M12 12.2l-3-.2-.1-2.6H6.5l.3 5.4L12 15.8v-3.6z" fill="#fff" opacity=".7" />
    </Svg>
  ),
  js: ({ size }) => (
    <Svg size={size} title="JavaScript">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#F7DF1E" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Arial, sans-serif" fill="#111">
        JS
      </text>
    </Svg>
  ),
  ts: ({ size }) => (
    <Svg size={size} title="TypeScript">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#3178C6" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Arial, sans-serif" fill="#fff">
        TS
      </text>
    </Svg>
  ),
  jsx: ({ size }) => (
    <Svg size={size} title="React JSX">
      <circle cx="12" cy="12" r="3.1" fill="#61DAFB" />
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61DAFB" strokeWidth="1.3" />
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61DAFB" strokeWidth="1.3" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61DAFB" strokeWidth="1.3" transform="rotate(120 12 12)" />
    </Svg>
  ),
  tsx: ({ size }) => (
    <Svg size={size} title="React TSX">
      <circle cx="12" cy="12" r="9" fill="#3178C6" />
      <ellipse cx="12" cy="12" rx="7.5" ry="3" fill="none" stroke="#fff" strokeWidth="1.2" />
      <ellipse cx="12" cy="12" rx="7.5" ry="3" fill="none" stroke="#fff" strokeWidth="1.2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="7.5" ry="3" fill="none" stroke="#fff" strokeWidth="1.2" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="1.6" fill="#fff" />
    </Svg>
  ),
  json: ({ size }) => (
    <Svg size={size} title="JSON">
      <rect x="4" y="3" width="16" height="18" rx="2" fill="#3C3C3C" />
      <text x="12" y="15.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fontFamily="Arial, sans-serif" fill="#F0DB4F">
        {'{ }'}
      </text>
    </Svg>
  ),
  md: ({ size }) => (
    <Svg size={size} title="Markdown">
      <rect x="4" y="3" width="16" height="18" rx="2" fill="#8a919c" />
      <path d="M7 16v-6l2.5 2.5L12 10v6zM14.5 16v-6l1.7 2 1.8-2v6z" fill="#fff" />
    </Svg>
  ),
  svg: ({ size }) => (
    <Svg size={size} title="SVG">
      <rect x="4" y="3" width="16" height="18" rx="2" fill="#FFB13B" />
      <path d="M9 15l2-5 1.6 3.4L14.5 10l2.5 5z" fill="#7a3e00" />
      <circle cx="9.4" cy="8.6" r="1.1" fill="#7a3e00" />
    </Svg>
  ),
  php: ({ size }) => (
    <Svg size={size} title="PHP">
      <ellipse cx="12" cy="12" rx="10" ry="7" fill="#777BB3" />
      <text x="12" y="15" textAnchor="middle" fontSize="7" fontWeight="800" fontFamily="Arial, sans-serif" fill="#fff">
        php
      </text>
    </Svg>
  ),
  yml: ({ size }) => (
    <Svg size={size} title="YAML">
      <rect x="4" y="3" width="16" height="18" rx="2" fill="#cb171e" />
      <text x="12" y="15.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fontFamily="Arial, sans-serif" fill="#fff">
        YML
      </text>
    </Svg>
  ),
  sql: ({ size }) => (
    <Svg size={size} title="SQL">
      <ellipse cx="12" cy="7" rx="7" ry="3" fill="#336791" />
      <path d="M5 7v10c0 1.7 3.1 3 7 3s7-1.3 7-3V7" fill="#336791" />
      <ellipse cx="12" cy="17" rx="7" ry="3" fill="#336791" opacity=".6" />
    </Svg>
  ),
  img: ({ size }) => (
    <Svg size={size} title="Image">
      <rect x="4" y="4" width="16" height="16" rx="2" fill="#2E9E6D" />
      <circle cx="9" cy="10" r="1.8" fill="#fff" />
      <path d="M5 18l5-5 3 3 3-3 3 3v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" fill="#fff" />
    </Svg>
  ),
  zip: ({ size }) => (
    <Svg size={size} title="ZIP archive">
      <rect x="5" y="3" width="14" height="18" rx="2" fill="#A75DBD" />
      <rect x="9.5" y="4.5" width="5" height="2" fill="#fff" opacity=".85" />
      <rect x="9.5" y="8" width="5" height="2" fill="#fff" opacity=".85" />
      <rect x="9.5" y="11.5" width="5" height="2" fill="#fff" opacity=".85" />
    </Svg>
  ),
  txt: ({ size }) => (
    <Svg size={size} title="Text file">
      <path d="M6 2h8l4 4v16H6z" fill="#e2e8ee" stroke="#8a919c" strokeWidth="1" />
      <path d="M9 10h6M9 13h6M9 16h4" stroke="#8a919c" strokeWidth="1.2" />
    </Svg>
  ),
  file: ({ size }) => (
    <Svg size={size} title="File">
      <path d="M6 2h8l4 4v16H6z" fill="#eef2f6" stroke="#8a919c" strokeWidth="1" />
      <path d="M14 2v4h4" fill="none" stroke="#8a919c" strokeWidth="1" />
    </Svg>
  ),
};

export default function FileIcon({ name, size = 16, isDir, open }: Props) {
  if (isDir) return <FolderIcon size={size} open={open} />;
  const info = fileTypeInfo(name);
  const Icon = ICONS[info.icon] ?? ICONS.file;
  return <Icon size={size} />;
}
