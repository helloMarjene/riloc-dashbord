'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity as ActivityIcon,
  ArrowRight,
  BarChart3,
  Code2,
  ExternalLink,
  FileCode2,
  FileText,
  Files,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  MonitorPlay,
  PackageOpen,
  ShieldCheck,
  Globe2,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useActivity } from '@/contexts/ActivityContext';
import { Badge, Card, Spinner } from '@/components/ui';
import ConnectPanel from '@/components/ConnectPanel';
import { getValidityInfo, formatLongDate } from '@/lib/domain';
import { DEFAULT_DOMAIN, LIVE_URL, WEBSITE_STATUS } from '@/lib/constants';
import { timeAgo } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';

const OUTCOME_TONE = { success: 'success', info: 'info', error: 'danger', warning: 'warning' } as const;

export default function OverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { stats, indexed, indexing, exportModified, source, rootName } = useWorkspace();
  const { items } = useActivity();
  const validity = useMemo(() => getValidityInfo(), []);

  const quickActions = [
    { label: 'Open Website', icon: ExternalLink, run: () => window.open(LIVE_URL, '_blank', 'noopener') },
    { label: 'Preview Website', icon: MonitorPlay, run: () => router.push('/preview') },
    { label: 'Edit Website Source', icon: Code2, run: () => router.push('/editor') },
    { label: 'Browse Website Files', icon: FolderOpen, run: () => router.push('/website-manager') },
    { label: 'Export Modified Files', icon: PackageOpen, run: () => void exportModified() },
    { label: 'View Domain Information', icon: Globe2, run: () => router.push('/domain') },
    { label: 'View SSL Certificate', icon: ShieldCheck, run: () => router.push('/ssl') },
    { label: 'Open Settings', icon: SettingsIcon, run: () => router.push('/settings') },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h2>Welcome back, {user?.email ?? 'administrator'}</h2>
          <p>
            Website status: <strong style={{ color: 'var(--success)' }}>{WEBSITE_STATUS}</strong> (configured) · Source:{' '}
            {indexed ? (source === 'fs' ? `Connected folder “${rootName}”` : 'Imported workspace') : 'Not connected'}
          </p>
        </div>
        <Badge tone="info">{indexed ? 'Source indexed' : 'Awaiting source'}</Badge>
      </div>

      {indexing && <Spinner label="Indexing website files…" />}

      {!indexed && !indexing && <ConnectPanel />}

      <div className="stats-grid">
        <StatCard icon={<Globe size={19} />} tone="green" label="Website Status" value={WEBSITE_STATUS} hint="Configured status, not a live availability check" />
        <StatCard icon={<FileText size={19} />} tone="blue" label="Website Pages" value={indexed ? stats.pageCount : '—'} hint={indexed ? 'HTML pages discovered in source' : 'Connect the source to count pages'} />
        <StatCard icon={<Files size={19} />} tone="blue" label="Source Files Indexed" value={indexed ? stats.fileCount : '—'} hint="All files found in the website folder" />
        <StatCard icon={<FileCode2 size={19} />} tone="orange" label="Locally Modified Files" value={indexed ? stats.modifiedCount : '—'} hint="Files with unsaved local changes" />
        <StatCard icon={<ImageIcon size={19} />} tone="blue" label="Media Assets" value={indexed ? stats.mediaCount : '—'} hint="Images discovered in the source" />
        <StatCard icon={<PackageOpen size={19} />} tone={stats.pendingExportCount > 0 ? 'orange' : 'gray'} label="Pending Export Changes" value={indexed ? stats.pendingExportCount : '—'} hint="Modified files not yet exported" />
        <StatCard
          icon={<Globe2 size={19} />}
          tone={validity.expired ? 'red' : 'green'}
          label="Domain Validity"
          value={validity.expired ? 'Expired' : `${validity.remainingDays} days left`}
          hint={`${formatLongDate(DEFAULT_DOMAIN.validityStart)} → ${formatLongDate(DEFAULT_DOMAIN.validityEnd)}`}
        />
        <StatCard icon={<ShieldCheck size={19} />} tone="blue" label="SSL Certificate" value="Informational doc" hint="See SSL Certificate section — not a live TLS scan" />
      </div>

      <Card title="Live Analytics">
        <div className="notice notice-info">
          <BarChart3 size={16} />
          <p>
            Visitor counts, traffic statistics, uptime percentages and security scans are <strong>not available</strong>{' '}
            in this dashboard. No analytics backend is connected by design (client-side only), and this dashboard does
            not fabricate metrics. Configure analytics on the hosting platform (e.g. Cloudflare) to obtain real data.
          </p>
        </div>
      </Card>

      <Card title="Website Quick Actions">
        <div className="quick-grid">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.label} className="action-tile" onClick={a.run}>
                <span className={`stat-icon ${['green', 'blue', 'orange', 'gray'][quickActions.indexOf(a) % 4]}`}>
                  <Icon size={17} />
                </span>
                {a.label}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid-2">
        <Card
          title="Recent Activity"
          actions={
            <Link href="/activity" className="row" style={{ gap: 4, fontSize: 12.5, fontWeight: 700 }}>
              View all <ArrowRight size={13} />
            </Link>
          }
        >
          {items.length === 0 ? (
            <p className="muted">No activity recorded yet. Actions you take in this dashboard will appear here.</p>
          ) : (
            items.slice(0, 6).map((a) => (
              <div key={a.id} className="activity-row">
                <span className={`activity-icon stat-icon-${OUTCOME_TONE[a.outcome] ?? 'info'}`} style={{ background: 'var(--blue-050)', color: 'var(--primary)' }}>
                  <ActivityIcon size={15} />
                </span>
                <div className="activity-body">
                  <div className="activity-title">{a.action}</div>
                  <div className="activity-meta">
                    {a.section} · {a.detail ? `${a.detail} · ` : ''}
                    {timeAgo(a.at)}
                  </div>
                </div>
                <Badge tone={OUTCOME_TONE[a.outcome] ?? 'info'}>{a.outcome}</Badge>
              </div>
            ))
          )}
        </Card>

        <Card title="Editing Workflow Reminder">
          <div className="stack-sm">
            <div className="notice notice-warning">
              <ShieldCheck size={16} />
              <p>
                Changes made here are <strong>local only</strong>. Saving writes to your connected website folder only
                after explicit permission, and nothing in this dashboard publishes to the live website at {LIVE_URL}.
              </p>
            </div>
            <ol style={{ margin: '4px 0 0 18px', color: 'var(--text-soft)', fontSize: 13, display: 'grid', gap: 6 }}>
              <li>Connect the website folder (or import files).</li>
              <li>Open a file and edit it with syntax highlighting.</li>
              <li>Save back to the source folder, or keep changes local.</li>
              <li>Export modified files as a ZIP and deploy them manually.</li>
            </ol>
            <Link href="/help" style={{ fontWeight: 700, fontSize: 13 }}>
              Read the full guide in Help →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint: string; tone: 'blue' | 'orange' | 'green' | 'red' | 'gray' }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-hint">{hint}</div>
      </div>
    </div>
  );
}
