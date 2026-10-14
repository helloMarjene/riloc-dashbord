import { DEFAULT_DOMAIN } from './constants';

export interface ValidityInfo {
  startMs: number;
  endMs: number;
  totalDays: number;
  remainingDays: number;
  elapsedDays: number;
  percentElapsed: number; // 0..100
  expired: boolean;
}

// Computed live from the browser's current date — never hardcoded.
export function getValidityInfo(now: number = Date.now()): ValidityInfo {
  const startMs = new Date(DEFAULT_DOMAIN.validityStart + 'T00:00:00').getTime();
  const endMs = new Date(DEFAULT_DOMAIN.validityEnd + 'T00:00:00').getTime();
  const totalDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
  const elapsedDays = Math.max(0, Math.round((now - startMs) / 86400000));
  const remainingDays = Math.max(0, Math.round((endMs - now) / 86400000));
  const percentElapsed = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  return { startMs, endMs, totalDays, remainingDays, elapsedDays, percentElapsed, expired: now > endMs };
}

export function formatLongDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
