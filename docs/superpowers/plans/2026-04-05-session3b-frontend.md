# Session 3B Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all placeholder views with full working UIs for Triggers, Reports, Overview anomaly alerts, budget enforcement, and provider colors — connecting the Session 3A backend to the React dashboard.

**Architecture:** Pure frontend work. All API endpoints already exist in the backend. We build React components that call them, render the data, and wire up WebSocket events for real-time updates. Follow existing patterns (Card/Modal/Button/Badge/Skeleton from `components/common/`).

**Tech Stack:** React 18, Vite, Tailwind CSS (custom dark theme), Recharts, Lucide React, Socket.IO client

---

## File Map

### New files
- `src/dashboard/src/utils/providerColors.js` — central provider → color/label mapping
- `src/dashboard/src/components/triggers/TriggerCard.jsx` — individual trigger row card
- `src/dashboard/src/components/triggers/AddTriggerModal.jsx` — create/edit trigger modal
- `src/dashboard/src/components/triggers/EventLog.jsx` — trigger events list with pagination
- `src/dashboard/src/components/triggers/PauseBanner.jsx` — paused entities alert banner
- `src/dashboard/src/components/reports/ReportCard.jsx` — individual report card
- `src/dashboard/src/components/reports/GenerateReportModal.jsx` — generate report modal
- `src/dashboard/src/components/reports/ReportDetail.jsx` — inline full report renderer
- `src/dashboard/src/components/overview/AnomalyAlertBar.jsx` — anomaly alert banner for Overview
- `src/dashboard/src/components/overview/BudgetOverrideModal.jsx` — override budget modal

### Modified files
- `src/dashboard/src/services/api.js` — add triggersAPI, reportsAPI, budgets.override
- `src/dashboard/src/views/Triggers.jsx` — full replace of placeholder
- `src/dashboard/src/views/Reports.jsx` — full replace of placeholder
- `src/dashboard/src/views/Overview.jsx` — add AnomalyAlertBar + updated budget section
- `src/dashboard/src/components/stats/ProviderBreakdown.jsx` — use providerColors
- `src/dashboard/src/contexts/AppContext.jsx` — wire 'anomaly_detected', 'budget_warning', 'budget_exceeded' WS events

---

## Task 1: Provider Colors Utility

**Files:**
- Create: `src/dashboard/src/utils/providerColors.js`

- [ ] **Step 1: Create the utility**

```js
// src/dashboard/src/utils/providerColors.js
export const PROVIDER_COLORS = {
  openai:      { color: '#22C55E', label: 'OpenAI',       bg: 'bg-[#22C55E]' },
  anthropic:   { color: '#F59E0B', label: 'Anthropic',    bg: 'bg-[#F59E0B]' },
  elevenlabs:  { color: '#8B5CF6', label: 'ElevenLabs',   bg: 'bg-[#8B5CF6]' },
  cartesia:    { color: '#14B8A6', label: 'Cartesia',      bg: 'bg-[#14B8A6]' },
  replicate:   { color: '#6366F1', label: 'Replicate',     bg: 'bg-[#6366F1]' },
  stability:   { color: '#EC4899', label: 'Stability AI',  bg: 'bg-[#EC4899]' },
};

export const DEFAULT_PROVIDER = { color: '#94A3B8', label: 'Other', bg: 'bg-[#94A3B8]' };

export function getProvider(name) {
  if (!name) return DEFAULT_PROVIDER;
  return PROVIDER_COLORS[name.toLowerCase()] || DEFAULT_PROVIDER;
}

export function getColor(name) {
  return getProvider(name).color;
}

export function getLabel(name) {
  return getProvider(name).label;
}

// For Recharts — array of { name, color } in consistent order
export const PROVIDER_CHART_COLORS = Object.entries(PROVIDER_COLORS).map(
  ([key, val]) => ({ key, color: val.color, label: val.label })
);
```

- [ ] **Step 2: Commit**
```bash
git add src/dashboard/src/utils/providerColors.js
git commit -m "feat: add provider colors utility"
```

---

## Task 2: Extend API Service

**Files:**
- Modify: `src/dashboard/src/services/api.js`

- [ ] **Step 1: Add Triggers API, Reports API, and budget override to api.js**

Append these exports at the bottom of the file, just before `export default`:

```js
/**
 * Triggers API
 */
export const triggersAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/triggers${qs ? `?${qs}` : ''}`);
  },
  create: (data) =>
    apiFetch('/api/triggers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    apiFetch(`/api/triggers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) =>
    apiFetch(`/api/triggers/${id}`, { method: 'DELETE' }),
  getEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/triggers/events${qs ? `?${qs}` : ''}`);
  },
  getStatus: () => apiFetch('/api/triggers/status'),
  resume: (entityType, entityId) =>
    apiFetch(`/api/triggers/resume/${entityType}/${entityId}`, { method: 'POST' }),
};

/**
 * Reports API
 */
export const reportsAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/reports${qs ? `?${qs}` : ''}`);
  },
  generate: (type, start_date, end_date) =>
    apiFetch('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ type, start_date, end_date }),
    }),
  getById: (id) => apiFetch(`/api/reports/${id}`),
  delete: (id) => apiFetch(`/api/reports/${id}`, { method: 'DELETE' }),
};

// Add budget override to budgetsAPI (add this inside the existing budgetsAPI object)
// NOTE: Also update the existing budgetsAPI.createOrUpdate body key from entity_id → scope_id
```

Also fix the existing `budgetsAPI.createOrUpdate` — the body key should be `scope_id` not `entity_id`:
```js
// REPLACE the existing createOrUpdate in budgetsAPI with:
createOrUpdate: (scope, period, limit_amount, scope_id = null) =>
  apiFetch('/api/budgets', {
    method: 'POST',
    body: JSON.stringify({ scope, period, limit_amount, scope_id }),
  }),
override: (id, new_limit_usd, expires_in_hours = 24) =>
  apiFetch(`/api/budgets/override/${id}`, {
    method: 'POST',
    body: JSON.stringify({ new_limit_usd, expires_in_hours }),
  }),
```

Add convenience exports at bottom:
```js
export const getTriggers = (params) => triggersAPI.getAll(params);
export const createTrigger = (data) => triggersAPI.create(data);
export const updateTrigger = (id, data) => triggersAPI.update(id, data);
export const deleteTrigger = (id) => triggersAPI.delete(id);
export const getTriggerEvents = (params) => triggersAPI.getEvents(params);
export const getTriggersStatus = () => triggersAPI.getStatus();
export const resumeEntity = (type, id) => triggersAPI.resume(type, id);

export const getReports = (params) => reportsAPI.getAll(params);
export const generateReport = (type, start, end) => reportsAPI.generate(type, start, end);
export const getReport = (id) => reportsAPI.getById(id);
export const deleteReport = (id) => reportsAPI.delete(id);

export const overrideBudget = (id, newLimit, hours) => budgetsAPI.override(id, newLimit, hours);
```

- [ ] **Step 2: Commit**
```bash
git add src/dashboard/src/services/api.js
git commit -m "feat: add triggers, reports, and budget override API methods"
```

---

## Task 3: TriggerCard Component

**Files:**
- Create: `src/dashboard/src/components/triggers/TriggerCard.jsx`

- [ ] **Step 1: Create TriggerCard**

```jsx
// src/dashboard/src/components/triggers/TriggerCard.jsx
import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';

const TRIGGER_TYPE_LABELS = {
  rate_spike:      { label: 'Rate Spike',      color: 'warning' },
  cost_spike:      { label: 'Cost Spike',      color: 'error' },
  error_storm:     { label: 'Error Storm',     color: 'error' },
  token_explosion: { label: 'Token Explosion', color: 'warning' },
  silent_drain:    { label: 'Silent Drain',    color: 'info' },
  new_provider:    { label: 'New Provider',    color: 'info' },
};

const ACTION_LABELS = {
  log_only:          { label: 'Log Only',          color: 'default' },
  dashboard_notify:  { label: 'Notify',            color: 'info' },
  claude_code_alert: { label: 'Claude Alert',      color: 'info' },
  auto_pause:        { label: 'Auto Pause',        color: 'warning' },
  auto_kill:         { label: 'Auto Kill',         color: 'error' },
  webhook:           { label: 'Webhook',           color: 'default' },
};

function thresholdSummary(type, threshold) {
  if (!threshold) return '—';
  switch (type) {
    case 'rate_spike':
    case 'cost_spike':
      return `${threshold.multiplier}× baseline in ${threshold.window_minutes}min window`;
    case 'error_storm':
      return `>${threshold.threshold_percent}% errors (min ${threshold.min_sample_size} calls)`;
    case 'token_explosion':
      return `${threshold.multiplier}× avg tokens`;
    case 'silent_drain':
      return `Idle calls in ${threshold.window_minutes}min window`;
    case 'new_provider':
      return `Any new provider in ${threshold.window_minutes}min`;
    default:
      return JSON.stringify(threshold);
  }
}

function TriggerCard({ trigger, onEdit, onDelete, onToggle }) {
  const typeInfo = TRIGGER_TYPE_LABELS[trigger.trigger_type] || { label: trigger.trigger_type, color: 'default' };
  const actionInfo = ACTION_LABELS[trigger.action] || { label: trigger.action, color: 'default' };
  const threshold = typeof trigger.threshold === 'string'
    ? JSON.parse(trigger.threshold)
    : trigger.threshold;

  return (
    <div className={`bg-bg-surface border rounded-lg p-4 transition-opacity ${trigger.enabled ? 'border-border' : 'border-border opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={typeInfo.color}>{typeInfo.label}</Badge>
            <Badge variant={actionInfo.color}>{actionInfo.label}</Badge>
            {trigger.scope !== 'global' && (
              <span className="text-text-secondary text-xs font-code">{trigger.scope_id || trigger.scope}</span>
            )}
          </div>
          <p className="text-text-secondary text-sm">{thresholdSummary(trigger.trigger_type, threshold)}</p>
          {trigger.webhook_url && (
            <p className="text-text-muted text-xs mt-1 font-code truncate">{trigger.webhook_url}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Enabled toggle */}
          <button
            onClick={() => onToggle(trigger.id, !trigger.enabled)}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${trigger.enabled ? 'bg-success' : 'bg-border'}`}
            aria-label={trigger.enabled ? 'Disable trigger' : 'Enable trigger'}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${trigger.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <button
            onClick={() => onEdit(trigger)}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label="Edit trigger"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(trigger.id)}
            className="p-1.5 rounded-md text-text-secondary hover:text-error hover:bg-bg-hover transition-colors"
            aria-label="Delete trigger"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TriggerCard;
```

---

## Task 4: AddTriggerModal Component

**Files:**
- Create: `src/dashboard/src/components/triggers/AddTriggerModal.jsx`

- [ ] **Step 1: Create AddTriggerModal**

```jsx
// src/dashboard/src/components/triggers/AddTriggerModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const TRIGGER_TYPES = [
  { value: 'rate_spike',      label: 'Rate Spike',      desc: 'Call rate exceeds baseline by a multiplier' },
  { value: 'cost_spike',      label: 'Cost Spike',      desc: 'Spending rate exceeds baseline by a multiplier' },
  { value: 'error_storm',     label: 'Error Storm',     desc: 'Error rate exceeds a percentage threshold' },
  { value: 'token_explosion', label: 'Token Explosion', desc: 'Single call uses abnormally high tokens' },
  { value: 'silent_drain',    label: 'Silent Drain',    desc: 'API calls with no active session detected' },
  { value: 'new_provider',    label: 'New Provider',    desc: 'A previously unseen provider is called' },
];

const ACTIONS = [
  { value: 'log_only',          label: 'Log Only' },
  { value: 'dashboard_notify',  label: 'Dashboard Notification' },
  { value: 'claude_code_alert', label: 'Claude Code Alert' },
  { value: 'auto_pause',        label: 'Auto Pause' },
  { value: 'auto_kill',         label: 'Auto Kill' },
  { value: 'webhook',           label: 'Webhook' },
];

const inputCls = 'w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-success';
const labelCls = 'block text-text-secondary text-sm mb-1';

function defaultThreshold(type) {
  switch (type) {
    case 'rate_spike':      return { multiplier: 5, window_minutes: 2, min_sample_size: 5, cooldown_minutes: 10 };
    case 'cost_spike':      return { multiplier: 3, window_minutes: 60, min_sample_size: 5 };
    case 'error_storm':     return { threshold_percent: 50, min_sample_size: 10, window_minutes: 10 };
    case 'token_explosion': return { multiplier: 10, min_sample_size: 5 };
    case 'silent_drain':    return { window_minutes: 60 };
    case 'new_provider':    return { window_minutes: 60 };
    default:                return {};
  }
}

function AddTriggerModal({ isOpen, onClose, onSave, editTrigger }) {
  const [scope, setScope] = useState('global');
  const [scopeId, setScopeId] = useState('');
  const [triggerType, setTriggerType] = useState('rate_spike');
  const [threshold, setThreshold] = useState(defaultThreshold('rate_spike'));
  const [action, setAction] = useState('dashboard_notify');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editTrigger) {
      setScope(editTrigger.scope || 'global');
      setScopeId(editTrigger.scope_id || '');
      setTriggerType(editTrigger.trigger_type || 'rate_spike');
      const t = typeof editTrigger.threshold === 'string'
        ? JSON.parse(editTrigger.threshold)
        : (editTrigger.threshold || defaultThreshold(editTrigger.trigger_type));
      setThreshold(t);
      setAction(editTrigger.action || 'dashboard_notify');
      setWebhookUrl(editTrigger.webhook_url || '');
    } else {
      setScope('global');
      setScopeId('');
      setTriggerType('rate_spike');
      setThreshold(defaultThreshold('rate_spike'));
      setAction('dashboard_notify');
      setWebhookUrl('');
    }
  }, [editTrigger, isOpen]);

  const handleTypeChange = (type) => {
    setTriggerType(type);
    setThreshold(defaultThreshold(type));
  };

  const updateThreshold = (key, value) => {
    setThreshold(prev => ({ ...prev, [key]: isNaN(Number(value)) ? value : Number(value) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        scope,
        scope_id: scope === 'global' ? null : (scopeId || null),
        trigger_type: triggerType,
        threshold,
        action,
        webhook_url: action === 'webhook' ? webhookUrl : null,
        enabled: true,
      }, editTrigger?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editTrigger ? 'Edit Trigger' : 'Add Trigger'}>
      <div className="space-y-4">
        {/* Scope */}
        <div>
          <label className={labelCls}>Scope</label>
          <select className={inputCls} value={scope} onChange={e => setScope(e.target.value)}>
            <option value="global">Global (all providers)</option>
            <option value="provider">Per Provider</option>
            <option value="project">Per Project</option>
          </select>
        </div>

        {scope !== 'global' && (
          <div>
            <label className={labelCls}>{scope === 'provider' ? 'Provider Name' : 'Project Path'}</label>
            <input
              className={inputCls}
              value={scopeId}
              onChange={e => setScopeId(e.target.value)}
              placeholder={scope === 'provider' ? 'e.g. openai' : 'e.g. /Users/you/myproject'}
            />
          </div>
        )}

        {/* Trigger Type */}
        <div>
          <label className={labelCls}>Trigger Type</label>
          <select className={inputCls} value={triggerType} onChange={e => handleTypeChange(e.target.value)}>
            {TRIGGER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="text-text-muted text-xs mt-1">
            {TRIGGER_TYPES.find(t => t.value === triggerType)?.desc}
          </p>
        </div>

        {/* Dynamic threshold config */}
        {(triggerType === 'rate_spike' || triggerType === 'cost_spike') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Multiplier</label>
              <input type="number" className={inputCls} value={threshold.multiplier ?? 5}
                onChange={e => updateThreshold('multiplier', e.target.value)} min={1} step={0.5} />
            </div>
            <div>
              <label className={labelCls}>Window (minutes)</label>
              <input type="number" className={inputCls} value={threshold.window_minutes ?? 2}
                onChange={e => updateThreshold('window_minutes', e.target.value)} min={1} />
            </div>
          </div>
        )}

        {triggerType === 'error_storm' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Error % Threshold</label>
              <input type="number" className={inputCls} value={threshold.threshold_percent ?? 50}
                onChange={e => updateThreshold('threshold_percent', e.target.value)} min={1} max={100} />
            </div>
            <div>
              <label className={labelCls}>Min Sample Size</label>
              <input type="number" className={inputCls} value={threshold.min_sample_size ?? 10}
                onChange={e => updateThreshold('min_sample_size', e.target.value)} min={1} />
            </div>
          </div>
        )}

        {triggerType === 'token_explosion' && (
          <div>
            <label className={labelCls}>Multiplier (vs avg tokens)</label>
            <input type="number" className={inputCls} value={threshold.multiplier ?? 10}
              onChange={e => updateThreshold('multiplier', e.target.value)} min={1} step={1} />
          </div>
        )}

        {(triggerType === 'silent_drain' || triggerType === 'new_provider') && (
          <div>
            <label className={labelCls}>Window (minutes)</label>
            <input type="number" className={inputCls} value={threshold.window_minutes ?? 60}
              onChange={e => updateThreshold('window_minutes', e.target.value)} min={1} />
          </div>
        )}

        {/* Action */}
        <div>
          <label className={labelCls}>Action</label>
          <select className={inputCls} value={action} onChange={e => setAction(e.target.value)}>
            {ACTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        {action === 'webhook' && (
          <div>
            <label className={labelCls}>Webhook URL</label>
            <input className={inputCls} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/..." />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editTrigger ? 'Update Trigger' : 'Add Trigger'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AddTriggerModal;
```

---

## Task 5: EventLog Component

**Files:**
- Create: `src/dashboard/src/components/triggers/EventLog.jsx`

- [ ] **Step 1: Create EventLog**

```jsx
// src/dashboard/src/components/triggers/EventLog.jsx
import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import Badge from '../common/Badge';
import Skeleton from '../common/Skeleton';
import { getTriggerEvents } from '../../services/api';
import { formatRelativeTime } from '../../services/formatters';

const TYPE_COLOR = {
  rate_spike: 'warning', cost_spike: 'error', error_storm: 'error',
  token_explosion: 'warning', silent_drain: 'info', new_provider: 'info',
};

function EventLog() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 10;

  useEffect(() => {
    loadEvents(0);
  }, []);

  async function loadEvents(newOffset) {
    setLoading(true);
    try {
      const res = await getTriggerEvents({ limit: LIMIT, offset: newOffset });
      if (newOffset === 0) {
        setEvents(res.events || []);
      } else {
        setEvents(prev => [...prev, ...(res.events || [])]);
      }
      setTotal(res.total || 0);
      setOffset(newOffset);
    } catch (err) {
      console.error('Failed to load trigger events:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && events.length === 0) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-text-muted">
        <AlertTriangle className="w-8 h-8 mb-2" />
        <p className="text-sm">No trigger events yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {events.map(event => (
          <div key={event.id} className="bg-bg-primary border border-border rounded-md p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={TYPE_COLOR[event.trigger_type] || 'default'}>
                  {event.trigger_type?.replace(/_/g, ' ')}
                </Badge>
                <span className="text-text-secondary">{event.action_taken?.replace(/_/g, ' ')}</span>
                {event.entity_id && (
                  <span className="text-text-muted font-code text-xs">{event.entity_id}</span>
                )}
              </div>
              <span className="text-text-muted text-xs flex-shrink-0">
                {formatRelativeTime(event.timestamp)}
              </span>
            </div>
            {event.metric_value != null && event.baseline_value != null && (
              <p className="text-text-muted text-xs mt-1">
                Value: <span className="text-warning">{event.metric_value?.toFixed(2)}</span>
                {' '}vs baseline <span className="text-text-secondary">{event.baseline_value?.toFixed(2)}</span>
              </p>
            )}
          </div>
        ))}
      </div>
      {events.length < total && (
        <button
          onClick={() => loadEvents(offset + LIMIT)}
          disabled={loading}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-md hover:bg-bg-hover transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          {loading ? 'Loading…' : `Load more (${total - events.length} remaining)`}
        </button>
      )}
    </div>
  );
}

export default EventLog;
```

---

## Task 6: PauseBanner Component

**Files:**
- Create: `src/dashboard/src/components/triggers/PauseBanner.jsx`

- [ ] **Step 1: Create PauseBanner**

```jsx
// src/dashboard/src/components/triggers/PauseBanner.jsx
import React from 'react';
import { PauseCircle } from 'lucide-react';
import Button from '../common/Button';
import { formatRelativeTime } from '../../services/formatters';

function PauseBanner({ paused, onResume }) {
  if (!paused || paused.length === 0) return null;

  return (
    <div className="bg-warning/10 border border-warning rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <PauseCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-warning font-medium text-sm mb-2">
            {paused.length} entity{paused.length > 1 ? 'ies' : ''} currently paused
          </p>
          <div className="space-y-2">
            {paused.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-bg-surface rounded-md px-3 py-2">
                <div>
                  <span className="text-text-primary text-sm font-medium">{p.entity_id}</span>
                  <span className="text-text-muted text-xs ml-2">({p.entity_type})</span>
                  <p className="text-text-secondary text-xs mt-0.5">
                    Paused {formatRelativeTime(p.paused_at)} — {p.reason || 'Anomaly detected'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => onResume(p.entity_type, p.entity_id)}
                  className="text-xs py-1 px-3"
                >
                  Resume
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PauseBanner;
```

---

## Task 7: Triggers View (main page)

**Files:**
- Modify: `src/dashboard/src/views/Triggers.jsx`

- [ ] **Step 1: Replace placeholder with full Triggers view**

```jsx
// src/dashboard/src/views/Triggers.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import TriggerCard from '../components/triggers/TriggerCard';
import AddTriggerModal from '../components/triggers/AddTriggerModal';
import EventLog from '../components/triggers/EventLog';
import PauseBanner from '../components/triggers/PauseBanner';
import Skeleton from '../components/common/Skeleton';
import { useToast } from '../contexts/ToastContext';
import {
  getTriggers, createTrigger, updateTrigger, deleteTrigger,
  getTriggersStatus, resumeEntity,
} from '../services/api';

const TABS = ['global', 'provider', 'project'];

function Triggers() {
  const [triggers, setTriggers] = useState([]);
  const [paused, setPaused] = useState([]);
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editTrigger, setEditTrigger] = useState(null);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [triggersRes, statusRes] = await Promise.all([
        getTriggers(),
        getTriggersStatus(),
      ]);
      setTriggers(triggersRes.triggers || []);
      setPaused(statusRes.paused || []);
    } catch (err) {
      console.error('Failed to load triggers:', err);
      setError('Failed to load triggers. Is the server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredTriggers = triggers.filter(t => t.scope === activeTab);

  const handleSave = async (data, id) => {
    try {
      if (id) {
        await updateTrigger(id, data);
        showToast('Trigger updated', 'success');
      } else {
        await createTrigger(data);
        showToast('Trigger created', 'success');
      }
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save trigger', 'error');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTrigger(id);
      showToast('Trigger deleted', 'success');
      loadData();
    } catch (err) {
      showToast('Failed to delete trigger', 'error');
    }
  };

  const handleToggle = async (id, enabled) => {
    try {
      await updateTrigger(id, { enabled });
      setTriggers(prev => prev.map(t => t.id === id ? { ...t, enabled } : t));
    } catch (err) {
      showToast('Failed to update trigger', 'error');
    }
  };

  const handleEdit = (trigger) => {
    setEditTrigger(trigger);
    setShowModal(true);
  };

  const handleResume = async (entityType, entityId) => {
    try {
      await resumeEntity(entityType, entityId);
      showToast(`Resumed ${entityId}`, 'success');
      loadData();
    } catch (err) {
      showToast('Failed to resume', 'error');
    }
  };

  const openAddModal = () => {
    setEditTrigger(null);
    setShowModal(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Anomaly Detection</h1>
          <p className="text-text-secondary">Configure triggers to detect and respond to unusual API activity</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button variant="primary" onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add Trigger
          </Button>
        </div>
      </div>

      {/* Pause banner */}
      <PauseBanner paused={paused} onResume={handleResume} />

      {error && (
        <div className="p-4 bg-bg-surface border border-error rounded-md text-error mb-4">{error}</div>
      )}

      {/* Tabs + triggers */}
      <Card>
        <div className="border-b border-border px-6 pt-4">
          <div className="flex gap-6">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-success text-success'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab}
                <span className="ml-2 text-xs text-text-muted">
                  ({triggers.filter(t => t.scope === tab).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : filteredTriggers.length === 0 ? (
            <div className="text-center py-10 text-text-muted">
              <p className="mb-3">No {activeTab} triggers configured</p>
              <Button variant="secondary" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first trigger
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTriggers.map(trigger => (
                <TriggerCard
                  key={trigger.id}
                  trigger={trigger}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Event Log */}
      <div className="mt-6">
        <Card title="Recent Events">
          <div className="p-6">
            <EventLog />
          </div>
        </Card>
      </div>

      <AddTriggerModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditTrigger(null); }}
        onSave={handleSave}
        editTrigger={editTrigger}
      />
    </div>
  );
}

export default Triggers;
```

- [ ] **Step 2: Commit**
```bash
git add src/dashboard/src/components/triggers/ src/dashboard/src/views/Triggers.jsx
git commit -m "feat: full Triggers view with anomaly detection UI"
```

---

## Task 8: ReportCard Component

**Files:**
- Create: `src/dashboard/src/components/reports/ReportCard.jsx`

- [ ] **Step 1: Create ReportCard**

```jsx
// src/dashboard/src/components/reports/ReportCard.jsx
import React from 'react';
import { FileText, Eye, Trash2 } from 'lucide-react';
import Badge from '../common/Badge';
import { formatRelativeTime, formatINR } from '../../services/formatters';

const TYPE_COLOR = { daily: 'info', weekly: 'success', monthly: 'warning', custom: 'default' };

function ReportCard({ report, onView, onDelete }) {
  const summary = report.summary_json
    ? (typeof report.summary_json === 'string' ? JSON.parse(report.summary_json) : report.summary_json)
    : null;

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <FileText className="w-8 h-8 text-text-muted flex-shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={TYPE_COLOR[report.period] || 'default'}>
              {report.period}
            </Badge>
            <span className="text-text-secondary text-xs">{formatRelativeTime(report.created_at)}</span>
          </div>
          {summary && (
            <p className="text-text-secondary text-sm">
              {formatINR(summary.total_inr || 0)} · {summary.total_calls || 0} calls
              {summary.provider_count ? ` · ${summary.provider_count} providers` : ''}
            </p>
          )}
          {!summary && (
            <p className="text-text-muted text-sm">Report #{report.id}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onView(report.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </button>
        <button
          onClick={() => onDelete(report.id)}
          className="p-1.5 rounded-md text-text-secondary hover:text-error hover:bg-bg-hover transition-colors"
          aria-label="Delete report"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default ReportCard;
```

---

## Task 9: GenerateReportModal Component

**Files:**
- Create: `src/dashboard/src/components/reports/GenerateReportModal.jsx`

- [ ] **Step 1: Create GenerateReportModal**

```jsx
// src/dashboard/src/components/reports/GenerateReportModal.jsx
import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const inputCls = 'w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-success';
const labelCls = 'block text-text-secondary text-sm mb-1';

function GenerateReportModal({ isOpen, onClose, onGenerate }) {
  const [type, setType] = useState('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate(type, type === 'custom' ? startDate : undefined, type === 'custom' ? endDate : undefined);
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Report">
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Report Type</label>
          <select className={inputCls} value={type} onChange={e => setType(e.target.value)}>
            <option value="daily">Daily (yesterday)</option>
            <option value="weekly">Weekly (last 7 days)</option>
            <option value="monthly">Monthly (last 30 days)</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {type === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" className={inputCls} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleGenerate} disabled={generating || (type === 'custom' && (!startDate || !endDate))}>
            {generating ? 'Generating…' : 'Generate Report'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default GenerateReportModal;
```

---

## Task 10: ReportDetail Component

**Files:**
- Create: `src/dashboard/src/components/reports/ReportDetail.jsx`

- [ ] **Step 1: Create ReportDetail**

```jsx
// src/dashboard/src/components/reports/ReportDetail.jsx
import React from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { formatINR } from '../../services/formatters';
import { getColor, getLabel } from '../../utils/providerColors';

function StatBlock({ label, value }) {
  return (
    <div className="bg-bg-primary border border-border rounded-lg p-4">
      <div className="text-2xl font-code font-bold text-text-primary mb-1">{value}</div>
      <div className="text-text-secondary text-sm">{label}</div>
    </div>
  );
}

function TrendIcon({ direction }) {
  if (direction === 'up') return <TrendingUp className="w-4 h-4 text-error" />;
  if (direction === 'down') return <TrendingDown className="w-4 h-4 text-success" />;
  return <Minus className="w-4 h-4 text-text-muted" />;
}

function ReportDetail({ report, onClose }) {
  if (!report) return null;
  const data = typeof report.summary_json === 'string'
    ? JSON.parse(report.summary_json)
    : (report.summary_json || {});

  const { summary = {}, providers = [], projects = [], top_calls = [], trends = {}, anomalies = [], recommendations = [] } = data;

  const handleExport = () => {
    const blob = new Blob([report.html_content || '<p>No HTML content</p>'], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info">{report.period}</Badge>
            <span className="text-text-secondary text-sm">
              Generated {new Date(report.created_at).toLocaleDateString()}
            </span>
          </div>
          <h2 className="text-xl font-bold text-text-primary capitalize">{report.period} Report</h2>
        </div>
        <div className="flex gap-2">
          {report.html_content && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Export HTML
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-2 border border-border rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-sm"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBlock label="Total Spend" value={formatINR(summary.total_inr || 0)} />
        <StatBlock label="API Calls" value={(summary.total_calls || 0).toLocaleString()} />
        <StatBlock label="Providers" value={summary.provider_count || 0} />
        <StatBlock label="Projects" value={summary.project_count || 0} />
      </div>

      {/* Trends */}
      {trends && (
        <Card>
          <div className="p-4">
            <h3 className="text-text-primary font-medium mb-3">Trend vs Previous Period</h3>
            <div className="flex items-center gap-3">
              <TrendIcon direction={trends.direction} />
              <span className="text-text-primary">
                {Math.abs(trends.change || 0).toFixed(1)}%
                <span className="text-text-secondary ml-2">
                  {trends.direction === 'up' ? 'increase' : trends.direction === 'down' ? 'decrease' : 'no change'}
                </span>
              </span>
              <span className="text-text-muted text-sm">
                ({formatINR(trends.previous || 0)} → {formatINR(trends.current || 0)})
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Provider breakdown */}
      {providers.length > 0 && (
        <Card title="Provider Breakdown">
          <div className="p-4 space-y-3">
            {providers.map(p => (
              <div key={p.provider} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(p.provider) }} />
                <span className="text-text-primary text-sm w-28 flex-shrink-0">{getLabel(p.provider)}</span>
                <div className="flex-1 bg-bg-primary rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${p.percentage || 0}%`, backgroundColor: getColor(p.provider) }}
                  />
                </div>
                <span className="text-text-secondary text-sm w-20 text-right font-code">{formatINR(p.cost || 0)}</span>
                <span className="text-text-muted text-xs w-8 text-right">{p.percentage || 0}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top calls */}
      {top_calls.length > 0 && (
        <Card title="Top 5 Expensive Calls">
          <div className="p-4">
            <div className="space-y-2">
              {top_calls.map((call, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-text-primary text-sm font-medium">{call.model || call.provider}</span>
                    <span className="text-text-muted text-xs ml-2">{call.tokens?.toLocaleString()} tokens</span>
                  </div>
                  <span className="text-text-primary font-code text-sm">{formatINR(call.cost_inr || (call.cost_usd || 0) * 85)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <Card title="Anomaly Events During Period">
          <div className="p-4 space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-text-primary text-sm">{a.trigger_type?.replace(/_/g, ' ')}</span>
                  <span className="text-text-muted text-xs ml-2">{a.action_taken?.replace(/_/g, ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card title="Recommendations">
          <div className="p-4 space-y-2">
            {recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                <Lightbulb className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <Badge variant={r.type === 'warning' ? 'warning' : 'info'} className="mr-2">{r.category}</Badge>
                  <span className="text-text-secondary text-sm">{r.message}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default ReportDetail;
```

---

## Task 11: Reports View (main page)

**Files:**
- Modify: `src/dashboard/src/views/Reports.jsx`

- [ ] **Step 1: Replace placeholder with full Reports view**

```jsx
// src/dashboard/src/views/Reports.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Plus, FileText } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ReportCard from '../components/reports/ReportCard';
import GenerateReportModal from '../components/reports/GenerateReportModal';
import ReportDetail from '../components/reports/ReportDetail';
import Skeleton from '../components/common/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { getReports, generateReport, getReport, deleteReport } from '../services/api';

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { showToast } = useToast();

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReports();
      setReports(res.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load reports. Is the server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleGenerate = async (type, startDate, endDate) => {
    try {
      await generateReport(type, startDate, endDate);
      showToast('Report generated', 'success');
      loadReports();
    } catch (err) {
      showToast(err.message || 'Failed to generate report', 'error');
      throw err;
    }
  };

  const handleView = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await getReport(id);
      setSelectedReport(res.report);
    } catch (err) {
      showToast('Failed to load report', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteReport(id);
      showToast('Report deleted', 'success');
      if (selectedReport?.id === id) setSelectedReport(null);
      loadReports();
    } catch (err) {
      showToast('Failed to delete report', 'error');
    }
  };

  if (selectedReport) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Reports</h1>
        {loadingDetail ? (
          <Skeleton className="h-96" />
        ) : (
          <ReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Usage Reports</h1>
          <p className="text-text-secondary">Comprehensive cost and usage analytics</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-bg-surface border border-error rounded-md text-error mb-4">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <h3 className="text-text-primary font-medium mb-2">No reports yet</h3>
            <p className="text-text-secondary text-sm mb-4">
              Generate your first report to see spending insights
            </p>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onView={handleView}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <GenerateReportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerate}
      />
    </div>
  );
}

export default Reports;
```

- [ ] **Step 2: Commit**
```bash
git add src/dashboard/src/components/reports/ src/dashboard/src/views/Reports.jsx
git commit -m "feat: full Reports view with generation, listing, and detail"
```

---

## Task 12: AnomalyAlertBar Component

**Files:**
- Create: `src/dashboard/src/components/overview/AnomalyAlertBar.jsx`

- [ ] **Step 1: Create AnomalyAlertBar**

```jsx
// src/dashboard/src/components/overview/AnomalyAlertBar.jsx
import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import { formatRelativeTime } from '../../services/formatters';

const TYPE_COLOR = {
  rate_spike: 'warning', cost_spike: 'error', error_storm: 'error',
  token_explosion: 'warning', silent_drain: 'info', new_provider: 'info',
};

function AnomalyAlertBar({ events }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  if (!events || events.length === 0) return null;

  const count = events.length;
  const isMultiple = count > 1;
  const borderColor = events.some(e => ['cost_spike', 'error_storm'].includes(e.trigger_type))
    ? 'border-error'
    : 'border-warning';
  const bgColor = events.some(e => ['cost_spike', 'error_storm'].includes(e.trigger_type))
    ? 'bg-error/10'
    : 'bg-warning/10';
  const iconColor = events.some(e => ['cost_spike', 'error_storm'].includes(e.trigger_type))
    ? 'text-error'
    : 'text-warning';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg mb-6 overflow-hidden`}>
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
          <span className={`font-medium ${iconColor}`}>
            {count} anomal{isMultiple ? 'ies' : 'y'} detected in the last 24 hours
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={e => { e.stopPropagation(); navigate('/triggers'); }}
            className={`flex items-center gap-1 text-sm ${iconColor} hover:opacity-80 transition-opacity`}
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4">
          <div className="space-y-2 mt-3">
            {events.slice(0, 5).map(event => (
              <div key={event.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant={TYPE_COLOR[event.trigger_type] || 'default'}>
                    {event.trigger_type?.replace(/_/g, ' ')}
                  </Badge>
                  {event.entity_id && (
                    <span className="text-text-muted font-code text-xs">{event.entity_id}</span>
                  )}
                </div>
                <span className="text-text-muted text-xs">{formatRelativeTime(event.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnomalyAlertBar;
```

---

## Task 13: BudgetOverrideModal Component

**Files:**
- Create: `src/dashboard/src/components/overview/BudgetOverrideModal.jsx`

- [ ] **Step 1: Create BudgetOverrideModal**

```jsx
// src/dashboard/src/components/overview/BudgetOverrideModal.jsx
import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { formatINR } from '../../services/formatters';

const inputCls = 'w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-success';
const labelCls = 'block text-text-secondary text-sm mb-1';

function BudgetOverrideModal({ isOpen, onClose, budget, onOverride }) {
  const [newLimit, setNewLimit] = useState('');
  const [hours, setHours] = useState(24);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!newLimit || isNaN(Number(newLimit))) return;
    setSaving(true);
    try {
      await onOverride(budget.id, Number(newLimit), hours);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!budget) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Override Budget Limit">
      <div className="space-y-4">
        <p className="text-text-secondary text-sm">
          Current limit: <span className="text-text-primary font-code">{formatINR(budget.limit_amount)}</span>
          {' '}({budget.period})
        </p>
        <div>
          <label className={labelCls}>New Limit (INR)</label>
          <input
            type="number"
            className={inputCls}
            value={newLimit}
            onChange={e => setNewLimit(e.target.value)}
            placeholder={String(budget.limit_amount)}
            min={budget.limit_amount}
          />
        </div>
        <div>
          <label className={labelCls}>Override expires in (hours)</label>
          <input
            type="number"
            className={inputCls}
            value={hours}
            onChange={e => setHours(Number(e.target.value))}
            min={1}
            max={168}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !newLimit}>
            {saving ? 'Saving…' : 'Apply Override'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default BudgetOverrideModal;
```

---

## Task 14: Update Overview Page

**Files:**
- Modify: `src/dashboard/src/views/Overview.jsx`

- [ ] **Step 1: Add anomaly alert + budget enforcement to Overview**

Add these imports at the top (after existing imports):
```jsx
import AnomalyAlertBar from '../components/overview/AnomalyAlertBar';
import BudgetOverrideModal from '../components/overview/BudgetOverrideModal';
import { getTriggerEvents, overrideBudget } from '../services/api';
```

Add state after existing state declarations:
```jsx
const [recentAnomalies, setRecentAnomalies] = useState([]);
const [showOverrideModal, setShowOverrideModal] = useState(false);
const [selectedBudget, setSelectedBudget] = useState(null);
```

Inside `loadData`, add anomaly events fetch alongside the existing parallel calls:
```jsx
// Add getTriggerEvents({ limit: 20 }) to the Promise.all array
const [statsRes, dailyRes, providersRes, outputsRes, budgetsRes, anomalyRes] = await Promise.all([
  getStats(),
  getDailySpend(30),
  getProviderBreakdown(),
  getTangibleOutputs(),
  getBudgets(),
  getTriggerEvents({ limit: 20 }).catch(() => ({ events: [] })),
]);
// Add after existing setters:
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
setRecentAnomalies((anomalyRes.events || []).filter(
  e => new Date(e.timestamp) > oneDayAgo
));
```

Replace the `{globalBudget && (<BudgetProgress ... />)}` block with:
```jsx
{globalBudget && (
  <div>
    <BudgetProgress
      current={globalBudget.current_spend || 0}
      limit={globalBudget.limit_amount}
      label={`${globalBudget.period} Budget`}
      status={globalBudget.status}
    />
    {globalBudget.status === 'exceeded' && (
      <div className="mt-2 flex items-center justify-between bg-error/10 border border-error rounded-md px-4 py-2">
        <span className="text-error text-sm font-medium">Budget exceeded — API calls are blocked</span>
        <button
          onClick={() => { setSelectedBudget(globalBudget); setShowOverrideModal(true); }}
          className="px-3 py-1 bg-error text-white text-xs rounded-md hover:opacity-90 transition-opacity"
        >
          Override
        </button>
      </div>
    )}
  </div>
)}
```

Add AnomalyAlertBar just after the opening `<div className="space-y-6">`:
```jsx
<AnomalyAlertBar events={recentAnomalies} />
```

Add BudgetOverrideModal before the closing `</div>`:
```jsx
<BudgetOverrideModal
  isOpen={showOverrideModal}
  onClose={() => setShowOverrideModal(false)}
  budget={selectedBudget}
  onOverride={async (id, newLimit, hours) => {
    await overrideBudget(id, newLimit / 85, hours);
    showToast('Budget override applied', 'success');
    loadData();
  }}
/>
```

Add `useToast` import:
```jsx
import { useToast } from '../contexts/ToastContext';
// Add inside Overview():
const { showToast } = useToast();
```

- [ ] **Step 2: Commit**
```bash
git add src/dashboard/src/components/overview/ src/dashboard/src/views/Overview.jsx
git commit -m "feat: anomaly alert bar and budget enforcement UI on Overview"
```

---

## Task 15: Wire WebSocket Events

**Files:**
- Modify: `src/dashboard/src/contexts/AppContext.jsx`

- [ ] **Step 1: Read AppContext.jsx to understand current WebSocket handling**

Read `src/dashboard/src/contexts/AppContext.jsx` in full before editing.

- [ ] **Step 2: Add anomaly_detected, budget_warning, budget_exceeded handlers**

Find the WebSocket event handler section (where `api_call` is listened to) and add:
```js
socket.on('anomaly_detected', (data) => {
  showToast(`Anomaly: ${data.trigger_type?.replace(/_/g, ' ')} detected`, 'warning');
});

socket.on('entity_paused', (data) => {
  showToast(`${data.entity_id} paused — ${data.reason || 'anomaly detected'}`, 'warning');
});

socket.on('budget_warning', (data) => {
  showToast(`Budget warning: ${Math.round(data.percentage || 0)}% of ${data.period} limit reached`, 'warning');
});

socket.on('budget_exceeded', (data) => {
  showToast(`Budget exceeded: ${data.period} limit reached — API calls blocked`, 'error');
});
```

Note: `showToast` needs to be imported from ToastContext inside AppContext. Check current pattern in AppContext — if it uses a different approach, adapt accordingly.

- [ ] **Step 3: Commit**
```bash
git add src/dashboard/src/contexts/AppContext.jsx
git commit -m "feat: wire anomaly and budget WebSocket events to toast notifications"
```

---

## Task 16: Update ProviderBreakdown Chart Colors

**Files:**
- Modify: `src/dashboard/src/components/stats/ProviderBreakdown.jsx`

- [ ] **Step 1: Read ProviderBreakdown.jsx in full**

Read `src/dashboard/src/components/stats/ProviderBreakdown.jsx` before editing.

- [ ] **Step 2: Replace hardcoded colors with providerColors utility**

Add import at top:
```jsx
import { getColor, getLabel } from '../../utils/providerColors';
```

Replace any hardcoded color assignments (like `COLORS = ['#22C55E', '#F59E0B', ...]`) with:
```jsx
// When rendering Recharts cells:
<Cell key={`cell-${index}`} fill={getColor(entry.provider)} />
// When rendering legend items:
<span style={{ color: getColor(item.provider) }}>{getLabel(item.provider)}</span>
```

- [ ] **Step 3: Commit**
```bash
git add src/dashboard/src/components/stats/ProviderBreakdown.jsx src/dashboard/src/utils/providerColors.js
git commit -m "feat: use unified provider color map in charts"
```

---

## Task 17: Full Visual QA with Preview

- [ ] **Step 1: Start dev servers if not running**

Backend on port 4000: `node src/index.js`
Frontend on port 3000: Vite from `src/dashboard/`

- [ ] **Step 2: Screenshot every page**

Use Preview MCP to screenshot:
1. `/` — Overview (anomaly bar, budget)
2. `/projects` — Projects list
3. `/projects/1` — ProjectDetail (if a project exists)
4. `/vault` — Key Vault
5. `/triggers` — Triggers (all 3 tabs)
6. `/reports` — Reports list and detail

- [ ] **Step 3: Fix any visual issues found**

Look for:
- Broken layouts
- Missing data / empty states not rendering
- Wrong colors
- Overflowing text
- Inconsistent spacing

- [ ] **Step 4: Commit fixes**
```bash
git add -A
git commit -m "fix: visual QA adjustments from Preview inspection"
```

---

## Task 18: Tag v0.3.0 and Push

- [ ] **Step 1: Final push to main**
```bash
git push origin main
```

- [ ] **Step 2: Tag v0.3.0**
```bash
git tag -a v0.3.0 -m "v0.3.0: Full anomaly detection, reports, and dashboard UI"
git push origin v0.3.0
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Covered |
|-------------|---------|
| Triggers view with tabs (Global/Provider/Project) | ✅ Task 7 |
| Trigger cards with type, threshold, action, toggle | ✅ Task 3 |
| Add Trigger modal with dynamic threshold config | ✅ Task 4 |
| Event Log with pagination | ✅ Task 5 |
| Pause Status banner with Resume buttons | ✅ Task 6 |
| Reports list with cards | ✅ Tasks 8+11 |
| Generate Report modal | ✅ Task 9 |
| Report detail view (stats, providers, top calls, anomalies, recs) | ✅ Task 10 |
| Anomaly alert bar on Overview | ✅ Tasks 12+14 |
| Budget enforcement UI (80% warning, 100% blocked, override) | ✅ Tasks 13+14 |
| Provider colors (all 7 providers) | ✅ Task 1+16 |
| WebSocket: anomaly_detected, budget_warning, budget_exceeded | ✅ Task 15 |
| Visual QA on all pages | ✅ Task 17 |
| Git tag v0.3.0 | ✅ Task 18 |
| Pre-existing test failures | ❌ Not covered — separate investigation needed |

### Missing: Pre-existing test failures
The spec mentions "Session 3A noted 5 pre-existing test failures." These need investigation before the v0.3.0 tag. Add this after Task 17:

**Task 17b: Fix Pre-existing Test Failures**
- [ ] Run `npm test` from project root and capture output
- [ ] Identify the 5 failing tests
- [ ] Fix each failure (likely schema/field name mismatches in integration tests)
- [ ] Run tests again to confirm all pass
- [ ] Commit fixes

### Placeholder Scan
No TBDs or TODOs in any task. All code is complete.

### Type Consistency Check
- `getTriggerEvents(params)` ← Task 2 defines this, Task 5 uses it ✅
- `resumeEntity(type, id)` ← Task 2 defines this, Task 7 uses it ✅
- `overrideBudget(id, newLimit, hours)` ← Task 2 defines this, Task 14 uses it ✅
- `formatINR` ← used in Tasks 10, 13 — already exists in `services/formatters.js` ✅
- `formatRelativeTime` ← used in Tasks 5, 12 — already exists in `services/formatters.js` ✅
- `getColor(name)`, `getLabel(name)` ← Task 1 defines, Tasks 10, 16 use ✅
