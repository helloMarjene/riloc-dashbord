import { AdminProfile, AppSettings, DomainInfo } from './types';

export const LIVE_URL = 'https://www.rilocs.org';
export const WEBSITE_NAME = 'RILOC';
export const WEBSITE_STATUS = 'Active';
export const DEFAULT_SOURCE_PATH = 'C:\\Users\\ADMIN\\Desktop\\RILOC-SUMMARY\\RILOCS-MAIN';

export const DEFAULT_ADMIN: AdminProfile = {
  name: 'ARSENE KAHUNGA',
  email: 'karungo@gmail.com',
  role: 'Administrator',
  hasCustomAvatar: false,
};

export const DEFAULT_PASSWORD = 'riloc2026';

export const DEFAULT_SETTINGS: AppSettings = {
  appName: 'RILOC Admin Dashboard',
  theme: 'light',
  sidebarCollapsed: false,
  dateFormat: 'absolute',
  notificationsEnabled: true,
};

export const DEFAULT_DOMAIN: DomainInfo = {
  domain: 'www.rilocs.org',
  registrar: 'Namecheap',
  registrant: {
    name: 'Arsene Kahunga',
    address: 'Masajja',
    city: 'Kampala',
    region: 'Kampala',
    postalCode: '17165',
    country: 'Uganda',
    telephone: '+256.0792096974',
    email: 'arsenekahungamjrn17165@gmail.com',
  },
  administrator: {
    name: 'Arsene Kahunga',
    address: 'Masajja',
    city: 'Kampala',
    region: 'Kampala',
    postalCode: '17165',
    country: 'Uganda',
    telephone: '+256.0792096974',
    email: 'arsenekahungamjrn17165@gmail.com',
  },
  technical: {
    name: 'Arsene Kahunga',
    address: 'Masajja',
    city: 'Kampala',
    region: 'Kampala',
    postalCode: '17165',
    country: 'Uganda',
    telephone: '+256.0792096974',
    email: 'arsenekahungamjrn17165@gmail.com',
  },
  billing: {
    name: 'Arsene Kahunga',
    address: 'Masajja',
    city: 'Kampala',
    region: 'Kampala',
    postalCode: '17165',
    country: 'Uganda',
    telephone: '+256.0792096974',
    email: 'arsenekahungamjrn17165@gmail.com',
  },
  validityStart: '2026-09-01',
  validityEnd: '2028-09-01',
  status: 'Active',
  protection: 'Protected by Cloudflare, as supplied by the administrator.',
};

export const EXCLUDED_EXPORT_PATTERNS = [
  'node_modules',
  '.git',
  '.env',
  '.env.',
  'id_rsa',
  'id_ed25519',
  '.pem',
  '.key',
  'credentials',
];

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico', 'bmp', 'avif'];
