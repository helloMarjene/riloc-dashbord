'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui';

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(user ? '/overview' : '/login');
  }, [ready, user, router]);

  return (
    <div className="splash">
      <Spinner label="Opening RILOC dashboard…" />
    </div>
  );
}
