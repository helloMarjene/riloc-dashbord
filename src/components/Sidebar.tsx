'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  Code2,
  FileText,
  Image as ImageIcon,
  MonitorPlay,
  Globe2,
  ShieldCheck,
  UserCircle,
  History,
  Settings,
  HelpCircle,
  LogOut,
  ChevronsLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

export const NAV_ITEMS = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/website-manager', label: 'Website Manager', icon: Globe },
  { href: '/editor', label: 'Source Code Editor', icon: Code2 },
  { href: '/pages', label: 'Pages and Content', icon: FileText },
  { href: '/media', label: 'Media Library', icon: ImageIcon },
  { href: '/preview', label: 'Website Preview', icon: MonitorPlay },
  { href: '/domain', label: 'Domain Information', icon: Globe2 },
  { href: '/ssl', label: 'SSL Certificate', icon: ShieldCheck },
  { href: '/profile', label: 'Admin Profile', icon: UserCircle },
  { href: '/activity', label: 'Activity History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help and Information', icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, avatarUrl, logout } = useAuth();
  const { settings, update } = useSettings();
  const collapsed = settings.sidebarCollapsed;

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`} aria-label="Main navigation">
      <div className="sidebar-brand">
        <img src="/assets/riloc-logo.png" alt="RILOC logo" className="sidebar-logo" />
        {!collapsed && (
          <div className="sidebar-brand-text">
            <strong>RILOC</strong>
            <span>Admin Dashboard</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? 'nav-active' : ''}`}
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <button
          className="nav-item sidebar-collapse"
          onClick={() => update({ sidebarCollapsed: !collapsed }, { silent: true })}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronsLeft size={18} className={collapsed ? 'flip-h' : ''} />
          {!collapsed && <span>Collapse</span>}
        </button>
        <div className="sidebar-admin">
          <img src={avatarUrl} alt="Administrator" className="sidebar-avatar" />
          {!collapsed && (
            <div className="sidebar-admin-text">
              <strong>{profile.name}</strong>
              <span>{profile.role}</span>
            </div>
          )}
          <button className="icon-btn sidebar-logout" onClick={handleLogout} title="Sign out" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
