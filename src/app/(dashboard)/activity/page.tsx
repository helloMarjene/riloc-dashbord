'use client';

import React, { useMemo, useState } from 'react';
import { Download, History, Trash2 } from 'lucide-react';
import { useActivity } from '@/contexts/ActivityContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';
import { downloadText, formatDate } from '@/lib/format';

const OUTCOME_TONE = { success: 'success', info: 'info', error: 'danger', warning: 'warning' } as const;
const OUTCOMES = ['all', 'success', 'info', 'warning', 'error'] as const;

export default function ActivityPage() {
  const { items, clear } = useActivity();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((a) => {
      if (outcome !== 'all' && a.outcome !== outcome) return false;
      if (!q) return true;
      return (
        a.action.toLowerCase().includes(q) ||
        a.section.toLowerCase().includes(q) ||
        (a.detail ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, query, outcome]);

  const exportHistory = () => {
    downloadText(JSON.stringify({ exportedAt: new Date().toISOString(), items }, null, 2), 'riloc-activity-history.json', 'application/json');
    toast('Activity history exported as JSON.', 'success');
  };

  return (
    <div className="stack">
      <div className="media-toolbar">
        <input
          className="input"
          style={{ maxWidth: 300 }}
          placeholder="Search activity…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search activity"
        />
        <select className="input" style={{ width: 'auto' }} value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} aria-label="Filter by outcome">
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o === 'all' ? 'All outcomes' : o}
            </option>
          ))}
        </select>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={exportHistory} disabled={items.length === 0}>
          Export JSON
        </Button>
        <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => setConfirmClear(true)} disabled={items.length === 0}>
          Clear History
        </Button>
      </div>

      <Card title={`Activity (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<History size={22} />}
            title={items.length === 0 ? 'No activity yet' : 'No matches'}
            message={
              items.length === 0
                ? 'Sign-ins, file edits, saves, exports and settings changes performed in this dashboard will be recorded here.'
                : 'Try a different search term or outcome filter.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Section</th>
                  <th>Detail</th>
                  <th>Date & time</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.action}</strong></td>
                    <td className="muted">{a.section}</td>
                    <td className="muted" style={{ maxWidth: 260, wordBreak: 'break-all' }}>{a.detail ?? '—'}</td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{formatDate(a.at)}</td>
                    <td>
                      <Badge tone={OUTCOME_TONE[a.outcome]}>{a.outcome}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ marginTop: 14 }}>
          Activity history is stored locally in this browser. It is not a centralized security audit log and cannot be
          relied on as one.
        </p>
      </Card>

      <ConfirmDialog
        open={confirmClear}
        title="Clear activity history?"
        message="All locally recorded activity will be permanently removed from this browser."
        confirmLabel="Clear history"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          clear();
          toast('Activity history cleared.', 'info');
        }}
      />
    </div>
  );
}
