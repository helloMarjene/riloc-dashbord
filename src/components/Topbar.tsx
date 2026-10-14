'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronRight, Menu, Moon, Search, Sun, LogOut, UserCircle, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useActivity } from '@/contexts/ActivityContext';
import { NAV_ITEMS } from './Sidebar';
import FileIcon from './FileIcon';
import { timeAgo } from '@/lib/format';
import { WEBSITE_STATUS } from '@/lib/constants';

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, avatarUrl, logout } = useAuth();
  const { settings, update } = useSettings();
  const { tree, openFile } = useWorkspace();
  const { items } = useActivity();

  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const current = NAV_ITEMS.find((n) => pathname.startsWith(n.href));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Array<{ path: string; name: string }> = [];
    const walk = (nodes: typeof tree) => {
      for (const n of nodes) {
        if (n.kind === 'file' && (n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q))) {
          out.push({ path: n.path, name: n.name });
        }
        if (n.children) walk(n.children);
      }
    };
    walk(tree);
    return out.slice(0, 6);
  }, [query, tree]);

  const gotoFile = (path: string) => {
    void openFile(path);
    setQuery('');
    router.push('/editor');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn topbar-burger" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">
          <Menu size={19} />
        </button>
        <div>
          <h1 className="topbar-title">{current?.label ?? 'Dashboard'}</h1>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/overview">Dashboard</Link>
            {current && (
              <>
                <ChevronRight size={12} />
                <span aria-current="page">{current.label}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      {mobileNav && (
        <div className="mobile-nav" onClick={() => setMobileNav(false)}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? 'nav-active' : ''}`}>
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="topbar-right">
        <div className="topbar-search">
          <Search size={15} className="topbar-search-icon" />
          <input
            ref={searchRef}
            className="input"
            placeholder="Search website files…  (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults.length > 0) gotoFile(searchResults[0].path);
              if (e.key === 'Escape') setQuery('');
            }}
            aria-label="Search website files"
          />
          {searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((r) => (
                <button key={r.path} className="search-result" onClick={() => gotoFile(r.path)}>
                  <FileIcon name={r.name} size={15} />
                  <span className="tree-name">{r.name}</span>
                  <span className="tree-path">{r.path}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="status-pill" title="Configured website status">
          <span className="status-dot" />
          {WEBSITE_STATUS}
        </span>

        <div className="topbar-menu-wrap">
          <button
            className="icon-btn"
            title="Notifications"
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setMenuOpen(false);
            }}
          >
            <Bell size={17} />
          </button>
          {notifOpen && (
            <div className="dropdown notif-dropdown">
              <h4>Recent Activity</h4>
              {settings.notificationsEnabled === false ? (
                <p className="dropdown-empty">Notifications are disabled in Settings.</p>
              ) : items.length === 0 ? (
                <p className="dropdown-empty">No activity recorded yet.</p>
              ) : (
                items.slice(0, 6).map((a) => (
                  <div key={a.id} className={`notif-item notif-${a.outcome}`}>
                    <strong>{a.action}</strong>
                    <span>
                      {a.section} · {timeAgo(a.at)}
                    </span>
                  </div>
                ))
              )}
              <Link href="/activity" className="dropdown-link" onClick={() => setNotifOpen(false)}>
                View all activity
              </Link>
            </div>
          )}
        </div>

        <button
          className="icon-btn"
          title={settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle theme"
          onClick={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' }, { silent: true })}
        >
          {settings.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="topbar-menu-wrap">
          <button className="topbar-profile" onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }} aria-label="Administrator menu">
            <img src={avatarUrl} alt="" className="topbar-avatar" />
            <span className="topbar-profile-name">{profile.name}</span>
          </button>
          {menuOpen && (
            <div className="dropdown profile-dropdown">
              <div className="profile-dropdown-head">
                <img src={avatarUrl} alt="" />
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.email}</span>
                </div>
              </div>
              <Link href="/profile" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                <UserCircle size={15} /> Admin Profile
              </Link>
              <Link href="/settings" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                <SettingsIcon size={15} /> Settings
              </Link>
              <button
                className="dropdown-item"
                onClick={() => {
                  logout();
                  router.replace('/login');
                }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
