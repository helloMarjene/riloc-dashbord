export interface FileNode {
  path: string;
  name: string;
  kind: 'file' | 'dir';
  size?: number;
  lastModified?: number;
  children?: FileNode[];
}

export type FileStatus = 'original' | 'modified' | 'saved-to-source' | 'pending-export';

export interface DraftEntry {
  path: string;
  content: string;
  savedAt: number;
  savedToSourceAt?: number;
  exportedAt?: number;
}

export interface StoredFile {
  path: string;
  text?: string;
  blob?: Blob;
  size: number;
  lastModified: number;
}

export type WorkspaceSource = 'none' | 'fs' | 'import';

export interface DomainContact {
  name: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  telephone: string;
  email: string;
}

export interface DomainInfo {
  domain: string;
  registrar: string;
  registrant: DomainContact;
  administrator: DomainContact;
  technical: DomainContact;
  billing: DomainContact;
  validityStart: string;
  validityEnd: string;
  status: string;
  protection: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  section: string;
  detail?: string;
  outcome: 'success' | 'info' | 'warning' | 'error';
  at: number;
}

export interface AdminProfile {
  name: string;
  email: string;
  role: string;
  hasCustomAvatar: boolean;
}

export interface AppSettings {
  appName: string;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  dateFormat: 'absolute' | 'relative';
  notificationsEnabled: boolean;
}

export interface PageField {
  key: string;
  label: string;
  selector?: string;
  index?: number;
  attr?: 'text' | 'content';
  kind: 'title' | 'meta' | 'selector';
}
