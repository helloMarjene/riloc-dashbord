export type LangId =
  | 'html'
  | 'css'
  | 'js'
  | 'ts'
  | 'jsx'
  | 'tsx'
  | 'json'
  | 'md'
  | 'svg'
  | 'php'
  | 'yml'
  | 'txt';

export interface FileTypeInfo {
  lang: LangId | null;
  label: string;
  icon: string; // key consumed by <FileIcon />
  color: string;
  image?: boolean;
}

const MAP: Record<string, FileTypeInfo> = {
  html: { lang: 'html', label: 'HTML', icon: 'html', color: '#E34F26' },
  htm: { lang: 'html', label: 'HTML', icon: 'html', color: '#E34F26' },
  css: { lang: 'css', label: 'CSS', icon: 'css', color: '#1572B6' },
  js: { lang: 'js', label: 'JavaScript', icon: 'js', color: '#F7DF1E' },
  mjs: { lang: 'js', label: 'JavaScript', icon: 'js', color: '#F7DF1E' },
  ts: { lang: 'ts', label: 'TypeScript', icon: 'ts', color: '#3178C6' },
  jsx: { lang: 'jsx', label: 'React (JSX)', icon: 'jsx', color: '#61DAFB' },
  tsx: { lang: 'tsx', label: 'React (TSX)', icon: 'tsx', color: '#3178C6' },
  json: { lang: 'json', label: 'JSON', icon: 'json', color: '#cbcb41' },
  md: { lang: 'md', label: 'Markdown', icon: 'md', color: '#8a919c' },
  markdown: { lang: 'md', label: 'Markdown', icon: 'md', color: '#8a919c' },
  svg: { lang: 'svg', label: 'SVG', icon: 'svg', color: '#FFB13B' },
  php: { lang: 'php', label: 'PHP', icon: 'php', color: '#777BB3' },
  yml: { lang: 'yml', label: 'YAML', icon: 'yml', color: '#cb171e' },
  yaml: { lang: 'yml', label: 'YAML', icon: 'yml', color: '#cb171e' },
  png: { lang: null, label: 'PNG Image', icon: 'img', color: '#2E9E6D', image: true },
  jpg: { lang: null, label: 'JPEG Image', icon: 'img', color: '#2E9E6D', image: true },
  jpeg: { lang: null, label: 'JPEG Image', icon: 'img', color: '#2E9E6D', image: true },
  webp: { lang: null, label: 'WebP Image', icon: 'img', color: '#2E9E6D', image: true },
  gif: { lang: null, label: 'GIF Image', icon: 'img', color: '#2E9E6D', image: true },
  bmp: { lang: null, label: 'BMP Image', icon: 'img', color: '#2E9E6D', image: true },
  ico: { lang: null, label: 'Icon', icon: 'img', color: '#2E9E6D', image: true },
  avif: { lang: null, label: 'AVIF Image', icon: 'img', color: '#2E9E6D', image: true },
  zip: { lang: null, label: 'ZIP Archive', icon: 'zip', color: '#A75DBD' },
  txt: { lang: 'txt', label: 'Text', icon: 'txt', color: '#8a919c' },
  sql: { lang: 'txt', label: 'SQL', icon: 'sql', color: '#336791' },
  lock: { lang: 'txt', label: 'Lockfile', icon: 'txt', color: '#8a919c' },
};

export function fileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx <= 0) return '';
  return name.slice(idx + 1).toLowerCase();
}

export function fileTypeInfo(name: string): FileTypeInfo {
  const ext = fileExtension(name);
  if (name.toLowerCase() === 'dockerfile') {
    return { lang: 'txt', label: 'Dockerfile', icon: 'txt', color: '#0db7ed' };
  }
  const hit = MAP[ext];
  if (hit) return hit;
  return { lang: 'txt', label: ext ? ext.toUpperCase() : 'File', icon: 'file', color: '#8a919c' };
}

export function isTextLike(name: string): boolean {
  const ext = fileExtension(name);
  if (!ext) return true;
  return (
    !['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'avif', 'zip', 'pdf', 'exe', 'mp4', 'mp3', 'woff', 'woff2', 'ttf', 'eot'].includes(ext)
  );
}

export function isImageFile(name: string): boolean {
  return fileTypeInfo(name).image === true;
}
