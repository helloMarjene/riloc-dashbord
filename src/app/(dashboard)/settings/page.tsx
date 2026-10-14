'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Camera,
  Database,
  Download,
  FolderOpen,
  KeyRound,
  LogOut,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserCircle,
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useActivity } from '@/contexts/ActivityContext';
import { useToast } from '@/contexts/ToastContext';
import { Button, Card, Field } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';
import { lsGet, lsRemove, lsSet } from '@/lib/storage';
import { DEFAULT_ADMIN } from '@/lib/constants';
import { downloadText } from '@/lib/format';
import { DomainContact } from '@/lib/types';

interface EditableDomain {
  registrar: string;
  registrant: DomainContact;
  administrator: DomainContact;
  technical: DomainContact;
  billing: DomainContact;
}

type Section = 'general' | 'admin' | 'security' | 'workspace' | 'data';

const SECTIONS: Array<{ id: Section; label: string; icon: React.ReactNode }> = [
  { id: 'general', label: 'General', icon: <SlidersHorizontal size={15} /> },
  { id: 'admin', label: 'Administrator', icon: <UserCircle size={15} /> },
  { id: 'security', label: 'Security', icon: <KeyRound size={15} /> },
  { id: 'workspace', label: 'Website Workspace', icon: <FolderOpen size={15} /> },
  { id: 'data', label: 'Data Management', icon: <Database size={15} /> },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('general');
  const { settings, update, reset } = useSettings();
  const auth = useAuth();
  const ws = useWorkspace();
  const { items, clear } = useActivity();
  const { toast } = useToast();
  const router = useRouter();

  const [adminName, setAdminName] = useState(auth.profile.name);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);
  const [confirmResetCreds, setConfirmResetCreds] = useState(false);
  const [confirmClearData, setConfirmClearData] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [confirmResetDomain, setConfirmResetDomain] = useState(false);
  const [confirmResetProfile, setConfirmResetProfile] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const changePassword = async () => {
    setPwError(null);
    setPwOk(false);
    if (!currentPw) return setPwError('Enter your current password.');
    if (!newPw) return setPwError('Enter a new password.');
    if (newPw.length < 6) return setPwError('The new password must be at least 6 characters long.');
    if (newPw !== confirmPw) return setPwError('The confirmation does not match the new password.');
    const result = await auth.changePassword(currentPw, newPw);
    if (!result.ok) return setPwError(result.error ?? 'Could not change the password.');
    setPwOk(true);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    toast('Password changed. Use it the next time you sign in.', 'success');
  };

  const exportSettings = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'riloc-dashboard',
      settings,
      profile: { name: auth.profile.name, email: auth.profile.email, role: auth.profile.role },
      domainEditable: lsGet('riloc.domain.v1', null),
    };
    downloadText(JSON.stringify(payload, null, 2), 'riloc-dashboard-settings.json', 'application/json');
    toast('Settings exported as JSON.', 'success');
  };

  const importSettings = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || (!data.settings && !data.domainEditable && !data.profile)) {
        toast('Invalid settings file: unrecognised structure. Nothing was imported.', 'error');
        return;
      }
      if (data.settings && typeof data.settings === 'object') {
        const s = data.settings;
        update({
          appName: typeof s.appName === 'string' ? s.appName : settings.appName,
          theme: s.theme === 'dark' ? 'dark' : 'light',
          sidebarCollapsed: Boolean(s.sidebarCollapsed),
          dateFormat: s.dateFormat === 'relative' ? 'relative' : 'absolute',
          notificationsEnabled: s.notificationsEnabled !== false,
        });
      }
      if (data.domainEditable && typeof data.domainEditable === 'object') {
        // Only editable contact fields are imported; fixed dates/status are never touched.
        lsSet('riloc.domain.v1', data.domainEditable as EditableDomain);
      }
      if (data.profile && typeof data.profile === 'object' && typeof data.profile.name === 'string') {
        auth.updateProfile({ name: data.profile.name.slice(0, 80) });
      }
      toast('Settings imported successfully.', 'success');
    } catch {
      toast('Invalid settings file: not valid JSON. Nothing was imported.', 'error');
    }
  };

  return (
    <div className="settings-layout">
      <div className="settings-nav card" style={{ padding: 10 }}>
        {SECTIONS.map((s) => (
          <button key={s.id} className={section === s.id ? 'active' : ''} onClick={() => setSection(s.id)}>
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <div className="stack">
        {section === 'general' && (
          <Card title="General Settings">
            <div className="grid-2">
              <Field label="Dashboard application name">
                <input className="input" value={settings.appName} onChange={(e) => update({ appName: e.target.value }, { silent: true })} />
              </Field>
              <Field label="Theme">
                <select className="input" value={settings.theme} onChange={(e) => update({ theme: e.target.value as 'light' | 'dark' }, { silent: true })}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </Field>
              <Field label="Date display format">
                <select className="input" value={settings.dateFormat} onChange={(e) => update({ dateFormat: e.target.value as 'absolute' | 'relative' }, { silent: true })}>
                  <option value="absolute">Absolute (14 Oct 2026, 17:00)</option>
                  <option value="relative">Relative (2 hr ago)</option>
                </select>
              </Field>
              <Field label="Notifications">
                <label className="checkbox-row" style={{ marginTop: 8 }}>
                  <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => update({ notificationsEnabled: e.target.checked }, { silent: true })} />
                  <span>Show activity notifications in the top bar</span>
                </label>
              </Field>
            </div>
            <label className="checkbox-row" style={{ marginTop: 14 }}>
              <input type="checkbox" checked={settings.sidebarCollapsed} onChange={(e) => update({ sidebarCollapsed: e.target.checked }, { silent: true })} />
              <span>Start with the sidebar collapsed</span>
            </label>
          </Card>
        )}

        {section === 'admin' && (
          <Card title="Administrator Settings">
            <div className="stack-sm">
              <div className="row" style={{ gap: 14 }}>
                <img src={auth.avatarUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                <div className="row">
                  <Button size="sm" variant="secondary" icon={<Camera size={14} />} onClick={() => avatarRef.current?.click()}>
                    Change Profile Image
                  </Button>
                  <span className="muted">Managed on the Admin Profile page too.</span>
                </div>
              </div>
              <Field label="Administrator name">
                <input className="input" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
              </Field>
              <Field label="Contact email display">
                <input className="input" value={auth.profile.email} disabled />
              </Field>
              <div className="row">
                <Button size="sm" onClick={() => auth.updateProfile({ name: adminName.trim() || DEFAULT_ADMIN.name })}>Save</Button>
                <Button size="sm" variant="secondary" onClick={() => setAdminName(auth.profile.name)}>Cancel</Button>
              </div>
            </div>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void auth.setAvatar(f).then(() => toast('Profile picture updated.', 'success'));
                e.target.value = '';
              }}
            />
          </Card>
        )}

        {section === 'security' && (
          <>
            <Card title="Change Password">
              <div className="grid-2">
                <Field label="Current password">
                  <input className="input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
                </Field>
                <div />
                <Field label="New password">
                  <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
                </Field>
                <Field label="Confirm new password">
                  <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
                </Field>
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <Button size="sm" icon={<KeyRound size={14} />} onClick={() => void changePassword()}>
                  Save Password
                </Button>
                {pwError && <p className="form-error" style={{ margin: 0 }}>{pwError}</p>}
                {pwOk && <p className="form-ok" style={{ margin: 0 }}>Password changed.</p>}
              </div>
            </Card>

            <Card title="Session & Credentials">
              <div className="stack-sm">
                <p className="muted">
                  Default credentials are <code>karungo@gmail.com</code> / <code>riloc2026</code>. A changed password is
                  stored in this browser and used for subsequent sign-ins on this device.
                </p>
                <div className="row">
                  <Button size="sm" variant="secondary" icon={<RotateCcw size={14} />} onClick={() => setConfirmResetCreds(true)}>
                    Reset Login Credentials
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<LogOut size={14} />}
                    onClick={() => {
                      auth.logout();
                      router.replace('/login');
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </Card>

            <div className="notice notice-warning">
              <ShieldAlert size={16} />
              <p>
                <strong>Client-side authentication is not secure for production use.</strong> The password and login
                logic live in browser code, so anyone with access to this device can inspect or change them. Use this
                dashboard only as a local administration tool, and never rely on this login to protect sensitive
                operations on a publicly hosted site.
              </p>
            </div>
          </>
        )}

        {section === 'workspace' && (
          <Card title="Website Workspace Settings">
            <div className="stack-sm">
              <dl>
                <div className="detail-row"><dt>Connection status</dt><dd>{ws.source === 'fs' ? `Connected folder “${ws.rootName}”` : ws.source === 'import' ? 'Imported workspace' : 'Not connected'}</dd></div>
                <div className="detail-row"><dt>Folder permission</dt><dd>{ws.source === 'fs' ? ws.fsPermission : '—'}</dd></div>
                <div className="detail-row"><dt>Files indexed</dt><dd>{ws.indexed ? ws.stats.fileCount : 0}</dd></div>
                <div className="detail-row"><dt>Modified files</dt><dd>{ws.stats.modifiedCount}</dd></div>
                <div className="detail-row"><dt>Export destination</dt><dd>Browser downloads folder (chosen by the browser on each export)</dd></div>
              </dl>
              <div className="row">
                <Button size="sm" variant="secondary" icon={<FolderOpen size={14} />} onClick={() => void ws.connectFolder().then((r) => r === 'connected' && toast('Folder connected.', 'success'))}>
                  {ws.source === 'fs' ? 'Connect Different Folder' : 'Connect Website Directory'}
                </Button>
                {ws.source === 'fs' && ws.fsPermission !== 'granted' && (
                  <Button size="sm" variant="secondary" onClick={() => void ws.reconnectFolder()}>
                    Reconnect Source Directory
                  </Button>
                )}
                {ws.source !== 'none' && (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDisconnect(true)}>
                    Disconnect
                  </Button>
                )}
              </div>
              <Field label="Export preferences" hint="Modified-only and full-workspace exports preserve relative paths and exclude sensitive files (node_modules, .git, .env, keys) with a warning.">
                <select className="input" defaultValue="safe" disabled>
                  <option value="safe">Safe export (exclude sensitive files, report exclusions)</option>
                </select>
              </Field>
            </div>
          </Card>
        )}

        {section === 'data' && (
          <>
            <Card title="Backup & Restore">
              <div className="stack-sm">
                <div className="row">
                  <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={exportSettings}>
                    Export Dashboard Settings (JSON)
                  </Button>
                  <Button size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => importRef.current?.click()}>
                    Import Settings
                  </Button>
                </div>
                <p className="muted">
                  The backup contains preferences, the administrator profile and editable domain contacts only. It never
                  contains passwords, file contents, or the fixed domain dates/status. Imported files are validated and
                  invalid files are rejected.
                </p>
              </div>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  void importSettings(e.target.files);
                  e.target.value = '';
                }}
              />
            </Card>

            <Card title="Reset & Cleanup">
              <div className="stack-sm">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>Clear local activity history ({items.length} entries)</span>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmClearHistory(true)}>Clear</Button>
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>Reset editable domain contact information</span>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmResetDomain(true)}>Reset</Button>
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>Reset administrator profile</span>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmResetProfile(true)}>Reset</Button>
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>Clear drafts &amp; imported files (local workspace)</span>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmClearData(true)}>Clear workspace</Button>
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>Reset all dashboard preferences to defaults</span>
                  <Button size="sm" variant="danger" onClick={() => setConfirmResetAll(true)}>Reset all</Button>
                </div>
              </div>
            </Card>

            <div className="notice notice-info">
              <Bell size={16} />
              <p>
                All dashboard data lives in this browser (localStorage and IndexedDB). It is not synchronized between
                devices, is not backed up anywhere, and does not survive clearing browser storage.
              </p>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog open={confirmResetCreds} title="Reset login credentials?" message="The sign-in returns to karungo@gmail.com / riloc2026. You stay signed in on this device." confirmLabel="Reset credentials" danger onCancel={() => setConfirmResetCreds(false)} onConfirm={() => { setConfirmResetCreds(false); void auth.resetCredentials(); toast('Credentials reset to defaults.', 'info'); }} />
      <ConfirmDialog open={confirmDisconnect} title="Disconnect website folder?" message="The dashboard forgets the folder handle. Local drafts and imported files are kept until you clear the workspace." confirmLabel="Disconnect" danger onCancel={() => setConfirmDisconnect(false)} onConfirm={() => { setConfirmDisconnect(false); ws.disconnect(); }} />
      <ConfirmDialog open={confirmClearData} title="Clear local workspace?" message="All editor drafts and imported files will be deleted from this browser. Files already written to your website folder are not affected." confirmLabel="Clear workspace" danger onCancel={() => setConfirmClearData(false)} onConfirm={() => { setConfirmClearData(false); void ws.clearLocalData(); toast('Local workspace cleared.', 'info'); }} />
      <ConfirmDialog open={confirmResetAll} title="Reset all dashboard preferences?" message="Theme, application name, sidebar and notification preferences return to defaults. Activity history, domain contacts and the workspace are not affected." confirmLabel="Reset preferences" danger onCancel={() => setConfirmResetAll(false)} onConfirm={() => { setConfirmResetAll(false); reset(); toast('Preferences reset to defaults.', 'info'); }} />
      <ConfirmDialog open={confirmResetDomain} title="Reset domain contacts?" message="Editable contact fields return to the originally supplied values. Fixed dates, status and protection are never changed." confirmLabel="Reset contacts" danger onCancel={() => setConfirmResetDomain(false)} onConfirm={() => { setConfirmResetDomain(false); lsRemove('riloc.domain.v1'); toast('Domain contacts will reset on next visit to the Domain page.', 'info'); }} />
      <ConfirmDialog open={confirmResetProfile} title="Reset administrator profile?" message="Name and profile picture return to the defaults." confirmLabel="Reset profile" danger onCancel={() => setConfirmResetProfile(false)} onConfirm={() => { setConfirmResetProfile(false); auth.resetProfile(); setAdminName(DEFAULT_ADMIN.name); toast('Profile reset.', 'info'); }} />
      <ConfirmDialog open={confirmClearHistory} title="Clear activity history?" message="All locally recorded activity entries will be deleted." confirmLabel="Clear history" danger onCancel={() => setConfirmClearHistory(false)} onConfirm={() => { setConfirmClearHistory(false); clear(); toast('Activity history cleared.', 'info'); }} />
    </div>
  );
}
