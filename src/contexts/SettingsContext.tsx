'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppSettings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { lsGet, lsSet } from '@/lib/storage';
import { useActivity } from './ActivityContext';

const KEY = 'riloc.settings.v1';

interface SettingsApi {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>, opts?: { silent?: boolean }) => void;
  reset: () => void;
}

const Ctx = createContext<SettingsApi>({ settings: DEFAULT_SETTINGS, update: () => {}, reset: () => {} });

export function useSettings(): SettingsApi {
  return useContext(Ctx);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const { log } = useActivity();

  useEffect(() => {
    const stored = lsGet<AppSettings | null>(KEY, null);
    if (stored) setSettings({ ...DEFAULT_SETTINGS, ...stored });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const update = useCallback(
    (patch: Partial<AppSettings>, opts?: { silent?: boolean }) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        lsSet(KEY, next);
        return next;
      });
      if (!opts?.silent) {
        const keys = Object.keys(patch).join(', ');
        log('Settings updated', 'Settings', 'success', keys);
      }
    },
    [log]
  );

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    lsSet(KEY, DEFAULT_SETTINGS);
    log('All dashboard preferences reset', 'Settings', 'warning');
  }, [log]);

  return <Ctx.Provider value={{ settings, update, reset }}>{children}</Ctx.Provider>;
}
