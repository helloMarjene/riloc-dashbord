'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Field } from '@/components/ui';
import { LIVE_URL } from '@/lib/constants';

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace('/overview');
  }, [ready, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }
    setBusy(true);
    try {
      const ok = await login(email, password, remember);
      if (ok) {
        router.replace('/overview');
      } else {
        setError('Incorrect email or password. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/assets/riloc-logo.png" alt="RILOC logo" />
          <div>
            <h1>RILOC Admin Dashboard</h1>
            <p>
              Administration console for <a href={LIVE_URL} target="_blank" rel="noreferrer">{LIVE_URL.replace('https://', '')}</a>
            </p>
          </div>
        </div>

        <form onSubmit={submit} noValidate>
          <Field label="Email address" htmlFor="login-email">
            <input
              id="login-email"
              className="input"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <div className="password-wrap">
              <input
                id="login-password"
                className="input"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="icon-btn password-toggle"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <label className="checkbox-row">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Keep me signed in on this device</span>
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={busy} icon={<LogIn size={15} />} className="login-submit">
            Sign In
          </Button>
        </form>

        <div className="login-note">
          <ShieldAlert size={15} />
          <p>
            This is an <strong>Admin dashbord</strong> login. Credentials are checked by NAMECHEAP, codes
            only  visible to the admin . Do not try to share your login credntials  to protect sensitive
            functions on a publicly hosted dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
