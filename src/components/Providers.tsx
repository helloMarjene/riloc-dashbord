'use client';

import React from 'react';
import { ToastProvider } from '@/contexts/ToastContext';
import { ActivityProvider } from '@/contexts/ActivityContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ActivityProvider>
        <SettingsProvider>
          <AuthProvider>
            <WorkspaceProvider>{children}</WorkspaceProvider>
          </AuthProvider>
        </SettingsProvider>
      </ActivityProvider>
    </ToastProvider>
  );
}
