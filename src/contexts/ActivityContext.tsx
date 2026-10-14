'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ActivityItem } from '@/lib/types';
import { lsGet, lsSet } from '@/lib/storage';
import { uid } from '@/lib/format';

const KEY = 'riloc.activity.v1';
const MAX_ITEMS = 500;

interface ActivityApi {
  items: ActivityItem[];
  log: (action: string, section: string, outcome?: ActivityItem['outcome'], detail?: string) => void;
  clear: () => void;
}

const Ctx = createContext<ActivityApi>({ items: [], log: () => {}, clear: () => {} });

export function useActivity(): ActivityApi {
  return useContext(Ctx);
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(lsGet<ActivityItem[]>(KEY, []));
    setLoaded(true);
  }, []);

  const log = useCallback((action: string, section: string, outcome: ActivityItem['outcome'] = 'success', detail?: string) => {
    const item: ActivityItem = { id: uid(), action, section, outcome, detail, at: Date.now() };
    setItems((prev) => {
      const next = [item, ...prev].slice(0, MAX_ITEMS);
      lsSet(KEY, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    lsSet(KEY, []);
  }, []);

  // Persist only after the initial load so we never wipe stored history with [].
  useEffect(() => {
    if (loaded) lsSet(KEY, items);
  }, [items, loaded]);

  return <Ctx.Provider value={{ items, log, clear }}>{children}</Ctx.Provider>;
}
