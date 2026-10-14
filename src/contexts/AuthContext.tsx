'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AdminProfile } from '@/lib/types';
import { DEFAULT_ADMIN, DEFAULT_PASSWORD } from '@/lib/constants';
import { lsGet, lsRemove, lsSet, sha256Hex, ssGet, ssRemove, ssSet } from '@/lib/storage';
import { kvStore } from '@/lib/db';
import { useActivity } from './ActivityContext';

const CREDS_KEY = 'riloc.credentials.v1';
const PROFILE_KEY = 'riloc.profile.v1';
const SESSION_KEY = 'riloc.session.v1';

interface Credentials {
  email: string;
  passHash: string;
}

export interface SessionUser {
  email: string;
}

interface AuthApi {
  user: SessionUser | null;
  ready: boolean;
  profile: AdminProfile;
  avatarUrl: string;
  login: (email: string, password: string, remember: boolean) => Promise<boolean>;
  logout: () => void;
  updateProfile: (patch: Partial<Pick<AdminProfile, 'name' | 'email'>>) => void;
  setAvatar: (file: File) => Promise<void>;
  resetProfile: () => void;
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  resetCredentials: () => Promise<void>;
}

const Ctx = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<AdminProfile>(DEFAULT_ADMIN);
  const [avatarUrl, setAvatarUrl] = useState<string>('/assets/arsene.jpg');
  const { log } = useActivity();

  useEffect(() => {
    // Seed credentials on first run so the default password works immediately.
    const existing = lsGet<Credentials | null>(CREDS_KEY, null);
    if (!existing || !existing.passHash) {
      sha256Hex(DEFAULT_PASSWORD).then((hash) => {
        lsSet(CREDS_KEY, { email: DEFAULT_ADMIN.email, passHash: hash } satisfies Credentials);
      });
    }
    const storedProfile = lsGet<AdminProfile | null>(PROFILE_KEY, null);
    if (storedProfile) setProfile(storedProfile);
    const remembered = lsGet<SessionUser | null>(SESSION_KEY, null);
    const sessionOnly = ssGet<SessionUser | null>(SESSION_KEY, null);
    setUser(remembered ?? sessionOnly);
    setReady(true);
  }, []);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    const custom = profile.hasCustomAvatar;
    if (!custom) {
      setAvatarUrl('/assets/arsene.jpg');
      return;
    }
    kvStore.get<Blob>('avatarBlob').then((blob) => {
      if (cancelled) return;
      if (blob) {
        const url = URL.createObjectURL(blob);
        revoked = url;
        setAvatarUrl(url);
      } else {
        setAvatarUrl('/assets/arsene.jpg');
      }
    });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [profile.hasCustomAvatar]);

  const login = useCallback(
    async (email: string, password: string, remember: boolean): Promise<boolean> => {
      const creds = lsGet<Credentials | null>(CREDS_KEY, null);
      if (!creds) return false;
      const hash = await sha256Hex(password);
      const ok = email.trim().toLowerCase() === creds.email.trim().toLowerCase() && hash === creds.passHash;
      if (ok) {
        const session: SessionUser = { email: creds.email };
        if (remember) {
          lsSet(SESSION_KEY, session);
          ssRemove(SESSION_KEY);
        } else {
          ssSet(SESSION_KEY, session);
          lsRemove(SESSION_KEY);
        }
        setUser(session);
        log('Administrator signed in', 'Authentication', 'success', email.trim().toLowerCase());
      }
      return ok;
    },
    [log]
  );

  const logout = useCallback(() => {
    lsRemove(SESSION_KEY);
    ssRemove(SESSION_KEY);
    setUser(null);
    log('Administrator signed out', 'Authentication', 'info');
  }, [log]);

  const persistProfile = (next: AdminProfile) => {
    setProfile(next);
    lsSet(PROFILE_KEY, next);
  };

  const updateProfile = useCallback(
    (patch: Partial<Pick<AdminProfile, 'name' | 'email'>>) => {
      persistProfile({ ...profile, ...patch });
      log('Administrator profile updated', 'Admin Profile', 'success');
    },
    [profile, log]
  );

  const setAvatar = useCallback(
    async (file: File) => {
      await kvStore.put('avatarBlob', file);
      persistProfile({ ...profile, hasCustomAvatar: true });
      log('Profile picture updated', 'Admin Profile', 'success', file.name);
    },
    [profile, log]
  );

  const resetProfile = useCallback(() => {
    lsRemove(PROFILE_KEY);
    kvStore.del('avatarBlob');
    setProfile(DEFAULT_ADMIN);
    log('Administrator profile reset to defaults', 'Admin Profile', 'info');
  }, [log]);

  const changePassword = useCallback(
    async (current: string, next: string): Promise<{ ok: boolean; error?: string }> => {
      const creds = lsGet<Credentials | null>(CREDS_KEY, null);
      if (!creds) return { ok: false, error: 'Credentials are not initialised.' };
      const currentHash = await sha256Hex(current);
      if (currentHash !== creds.passHash) return { ok: false, error: 'The current password you entered is incorrect.' };
      const nextHash = await sha256Hex(next);
      lsSet(CREDS_KEY, { ...creds, passHash: nextHash });
      log('Password changed', 'Security', 'success');
      return { ok: true };
    },
    [log]
  );

  const resetCredentials = useCallback(async () => {
    const hash = await sha256Hex(DEFAULT_PASSWORD);
    lsSet(CREDS_KEY, { email: DEFAULT_ADMIN.email, passHash: hash } satisfies Credentials);
    log('Login credentials reset to defaults', 'Security', 'warning');
  }, [log]);

  return (
    <Ctx.Provider
      value={{
        user,
        ready,
        profile,
        avatarUrl,
        login,
        logout,
        updateProfile,
        setAvatar,
        resetProfile,
        changePassword,
        resetCredentials,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
