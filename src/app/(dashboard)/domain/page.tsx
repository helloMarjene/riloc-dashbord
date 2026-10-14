'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Copy, Download, Globe2, Lock, Pencil, RotateCcw, Save, ShieldCheck, Store, UserRound, Users } from 'lucide-react';
import { DomainContact } from '@/lib/types';
import { DEFAULT_DOMAIN } from '@/lib/constants';
import { lsGet, lsSet } from '@/lib/storage';
import { useActivity } from '@/contexts/ActivityContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, Field } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getValidityInfo, formatLongDate } from '@/lib/domain';
import { downloadText } from '@/lib/format';

const STORE_KEY = 'riloc.domain.v1';

type TabId = 'overview' | 'registrant' | 'administrator' | 'technical' | 'billing' | 'validity' | 'registrar' | 'protection' | 'export';

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Domain Overview', icon: <Globe2 size={15} /> },
  { id: 'registrant', label: 'Registrant Contact', icon: <UserRound size={15} /> },
  { id: 'administrator', label: 'Administrator Contact', icon: <Users size={15} /> },
  { id: 'technical', label: 'Technical Contact', icon: <Store size={15} /> },
  { id: 'billing', label: 'Billing Contact', icon: <Pencil size={15} /> },
  { id: 'validity', label: 'Registration & Validity', icon: <CalendarClock size={15} /> },
  { id: 'registrar', label: 'Registrar Information', icon: <Globe2 size={15} /> },
  { id: 'protection', label: 'Domain Protection', icon: <ShieldCheck size={15} /> },
  { id: 'export', label: 'Export Information', icon: <Download size={15} /> },
];

interface EditableDomain {
  registrar: string;
  registrant: DomainContact;
  administrator: DomainContact;
  technical: DomainContact;
  billing: DomainContact;
}

const CONTACT_FIELDS: Array<{ key: keyof DomainContact; label: string; type?: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'address', label: 'Address line' },
  { key: 'city', label: 'City' },
  { key: 'region', label: 'Region' },
  { key: 'postalCode', label: 'Postal code' },
  { key: 'country', label: 'Country' },
  { key: 'telephone', label: 'Telephone', type: 'tel' },
  { key: 'email', label: 'Email', type: 'email' },
];

function loadEditable(): EditableDomain {
  const stored = lsGet<EditableDomain | null>(STORE_KEY, null);
  return stored ?? {
    registrar: DEFAULT_DOMAIN.registrar,
    registrant: { ...DEFAULT_DOMAIN.registrant },
    administrator: { ...DEFAULT_DOMAIN.administrator },
    technical: { ...DEFAULT_DOMAIN.technical },
    billing: { ...DEFAULT_DOMAIN.billing },
  };
}

export default function DomainPage() {
  const [tab, setTab] = useState<TabId>('overview');
  const [editable, setEditable] = useState<EditableDomain>(loadEditable);
  const [draft, setDraft] = useState<DomainContact | null>(null);
  const [editingContact, setEditingContact] = useState<keyof EditableDomain | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const { log } = useActivity();
  const { toast } = useToast();
  const validity = useMemo(() => getValidityInfo(), []);

  useEffect(() => {
    lsSet(STORE_KEY, editable);
  }, [editable]);

  const startEdit = (key: keyof EditableDomain) => {
    setEditingContact(key);
    const value = editable[key];
    setDraft(typeof value === 'string' ? null : { ...(value as DomainContact) });
  };

  const saveEdit = () => {
    if (!editingContact || !draft) return;
    setEditable((prev) => ({ ...prev, [editingContact]: draft }));
    log(`${titleCase(String(editingContact))} contact updated`, 'Domain Information', 'success');
    toast('Contact information saved locally.', 'success');
    setEditingContact(null);
    setDraft(null);
  };

  const resetContact = (key: keyof EditableDomain) => {
    const defaults: EditableDomain = {
      registrar: DEFAULT_DOMAIN.registrar,
      registrant: { ...DEFAULT_DOMAIN.registrant },
      administrator: { ...DEFAULT_DOMAIN.administrator },
      technical: { ...DEFAULT_DOMAIN.technical },
      billing: { ...DEFAULT_DOMAIN.billing },
    };
    setEditable((prev) => ({ ...prev, [key]: defaults[key] }));
    log(`${titleCase(String(key))} reset to supplied defaults`, 'Domain Information', 'warning');
    toast('Reset to the originally supplied values.', 'info');
  };

  const exportJson = () => {
    const payload = {
      note: 'Administrator-maintained display values. Not verified against the registrar.',
      domain: DEFAULT_DOMAIN.domain,
      ...editable,
      validityStart: DEFAULT_DOMAIN.validityStart,
      validityEnd: DEFAULT_DOMAIN.validityEnd,
      status: DEFAULT_DOMAIN.status,
      protection: DEFAULT_DOMAIN.protection,
      exportedAt: new Date().toISOString(),
    };
    downloadText(JSON.stringify(payload, null, 2), 'riloc-domain-information.json', 'application/json');
    log('Domain information exported as JSON', 'Domain Information', 'success');
  };

  const contactTab = (key: 'registrant' | 'administrator' | 'technical' | 'billing') => {
    const value = editable[key];
    const isEditing = editingContact === key;
    return (
      <Card
        title={`${titleCase(key)} Contact`}
        actions={
          !isEditing ? (
            <div className="row" style={{ gap: 6 }}>
              <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => startEdit(key)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => resetContact(key)}>
                Reset
              </Button>
            </div>
          ) : (
            <div className="row" style={{ gap: 6 }}>
              <Button size="sm" variant="ghost" onClick={() => { setEditingContact(null); setDraft(null); }}>
                Cancel
              </Button>
              <Button size="sm" icon={<Save size={13} />} onClick={saveEdit}>
                Save
              </Button>
            </div>
          )
        }
      >
        <div className="grid-2">
          {CONTACT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <input
                className="input"
                type={f.type ?? 'text'}
                value={isEditing && draft ? draft[f.key] : value[f.key]}
                disabled={!isEditing}
                onChange={(e) => draft && setDraft({ ...draft, [f.key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <div className="settings-layout">
      <div className="settings-nav card" style={{ padding: 10 }}>
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="stack">
        <div className="notice notice-info">
          <Lock size={16} />
          <p>
            Registration dates, domain status, and protection details are fixed configuration values in this dashboard.
            Changes to this display do not modify the registrar or Cloudflare account.
          </p>
        </div>

        {tab === 'overview' && (
          <Card
            title="Domain Overview"
            actions={
              <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => setConfirmReset(true)}>
                Reset all editable info
              </Button>
            }
          >
            <div className="grid-2">
              <dl>
                <div className="detail-row"><dt>Domain</dt><dd><strong>{DEFAULT_DOMAIN.domain}</strong></dd></div>
                <div className="detail-row"><dt>Live website</dt><dd><a href={`https://${DEFAULT_DOMAIN.domain}`} target="_blank" rel="noreferrer">{DEFAULT_DOMAIN.domain}</a></dd></div>
                <div className="detail-row"><dt>Registrar</dt><dd>{editable.registrar}</dd></div>
                <div className="detail-row"><dt>Domain status</dt><dd><Badge tone="success">{DEFAULT_DOMAIN.status}</Badge></dd></div>
              </dl>
              <dl>
                <div className="detail-row"><dt>Registered on</dt><dd>{formatLongDate(DEFAULT_DOMAIN.validityStart)}</dd></div>
                <div className="detail-row"><dt>Expires on</dt><dd>{formatLongDate(DEFAULT_DOMAIN.validityEnd)}</dd></div>
                <div className="detail-row"><dt>Remaining</dt><dd>{validity.expired ? 'Expired' : `${validity.remainingDays} days`}</dd></div>
                <div className="detail-row"><dt>Protection</dt><dd>{DEFAULT_DOMAIN.protection}</dd></div>
              </dl>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="validity-bar" aria-hidden>
                <div className="validity-fill" style={{ width: `${validity.percentElapsed}%` }} />
              </div>
              <p className="muted">
                Validity progress is calculated from the current date in your browser ({new Date().toLocaleDateString('en-GB')}),
                not hardcoded.
              </p>
            </div>
          </Card>
        )}

        {tab === 'registrant' && contactTab('registrant')}
        {tab === 'administrator' && contactTab('administrator')}
        {tab === 'technical' && contactTab('technical')}
        {tab === 'billing' && contactTab('billing')}

        {tab === 'validity' && (
          <Card title="Registration and Validity">
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-date">Registration date</div>
                <div className="timeline-value">{formatLongDate(DEFAULT_DOMAIN.validityStart)}</div>
              </div>
              <div className="timeline-item accent">
                <div className="timeline-date">Today (your browser’s date)</div>
                <div className="timeline-value">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-date">Expiry date</div>
                <div className="timeline-value">{formatLongDate(DEFAULT_DOMAIN.validityEnd)}</div>
              </div>
            </div>
            <div className="validity-bar">
              <div className="validity-fill" style={{ width: `${validity.percentElapsed}%` }} />
            </div>
            <p>
              {validity.expired
                ? 'The configured validity period has ended, according to this browser’s clock.'
                : `${validity.remainingDays} day(s) of registration validity remain (of ${validity.totalDays} total).`}
            </p>
            <p className="muted" style={{ marginTop: 8 }}>
              These dates are administrator-supplied configuration values. This dashboard does not query Namecheap, and
              the “Active” label is a configured status — not an external verification.
            </p>
          </Card>
        )}

        {tab === 'registrar' && (
          <Card
            title="Registrar Information"
            actions={
              <div className="row" style={{ gap: 6 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Pencil size={13} />}
                  onClick={() => {
                    const next = window.prompt('Registrar name', editable.registrar);
                    if (next && next.trim()) {
                      setEditable((prev) => ({ ...prev, registrar: next.trim() }));
                      log('Registrar name updated', 'Domain Information', 'success');
                    }
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditable((prev) => ({ ...prev, registrar: DEFAULT_DOMAIN.registrar })); toast('Registrar reset.', 'info'); }}>
                  Reset
                </Button>
              </div>
            }
          >
            <dl>
              <div className="detail-row"><dt>Registrar</dt><dd>{editable.registrar}</dd></div>
              <div className="detail-row"><dt>Management</dt><dd>Via the registrar’s own control panel — not via this dashboard.</dd></div>
            </dl>
            <p className="muted" style={{ marginTop: 10 }}>
              This dashboard never contacts {editable.registrar}. Update actual registration records in the registrar’s
              account, then reflect any changes here manually.
            </p>
          </Card>
        )}

        {tab === 'protection' && (
          <Card title="Domain Protection">
            <div className="stack-sm">
              <Badge tone="info">{DEFAULT_DOMAIN.protection}</Badge>
              <p>
                Protection status above is the value supplied by the administrator and is fixed in this dashboard. It is
                not a live query to Cloudflare.
              </p>
              <p className="muted">
                Note: domain/DNS protection (Cloudflare) is separate from the SSL/TLS certificate that the web server
                presents to visitors. See the SSL Certificate section for the informational document about that.
              </p>
            </div>
          </Card>
        )}

        {tab === 'export' && (
          <Card title="Export Information">
            <div className="stack-sm">
              <p>Download the full domain record (fixed values + your editable contacts) as JSON for your records.</p>
              <div className="row">
                <Button size="sm" icon={<Download size={14} />} onClick={exportJson}>
                  Download JSON
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Copy size={14} />}
                  onClick={() => {
                    void navigator.clipboard?.writeText(DEFAULT_DOMAIN.domain).then(() => toast('Domain copied.', 'success'));
                  }}
                >
                  Copy Domain
                </Button>
              </div>
              <p className="muted">The export contains display values only — no registrar credentials.</p>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset domain information?"
        message="All editable contact details will return to the originally supplied values."
        confirmLabel="Reset"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          setEditable(loadEditable());
        }}
      />
    </div>
  );
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
