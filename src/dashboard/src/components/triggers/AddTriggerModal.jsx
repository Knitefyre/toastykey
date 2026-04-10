import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Tooltip from '../common/Tooltip';

const TRIGGER_TYPES = [
  { value: 'rate_spike',      label: 'Rate Spike',      desc: 'Your agent suddenly makes way more API calls than usual — like going from 10/min to 50/min.' },
  { value: 'cost_spike',      label: 'Cost Spike',      desc: 'Your spending spikes abnormally — like ₹20/hr jumping to ₹200/hr.' },
  { value: 'error_storm',     label: 'Error Storm',     desc: 'Lots of API calls start failing at once — more than 50% errors means something broke.' },
  { value: 'token_explosion', label: 'Token Explosion', desc: 'A single API call uses way more tokens than normal — like 10x your average.' },
  { value: 'silent_drain',    label: 'Silent Drain',    desc: 'API calls happening when nothing should be running — might be a runaway agent.' },
  { value: 'new_provider',    label: 'New Provider',    desc: 'Your code starts calling a provider you\'ve never used before.' },
];

const ACTIONS = [
  { value: 'log_only',          label: 'Log Only',                 desc: 'Just record the event — no notifications or blocks.' },
  { value: 'dashboard_notify',  label: 'Dashboard Notification',  desc: 'Show an alert in the ToastyKey dashboard.' },
  { value: 'claude_code_alert', label: 'Claude Code Alert',       desc: 'Send a notification to Claude Code via MCP.' },
  { value: 'auto_pause',        label: 'Auto Pause',              desc: 'Stop all API calls until you manually resume.' },
  { value: 'auto_kill',         label: 'Auto Kill',               desc: 'Immediately terminate all API calls — use for emergencies only.' },
  { value: 'webhook',           label: 'Webhook',                 desc: 'Send a POST request to your webhook URL (Slack, Discord, etc).' },
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
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setSaveError(null);
    if (editTrigger) {
      setScope(editTrigger.scope || 'global');
      setScopeId(editTrigger.scope_id || '');
      setTriggerType(editTrigger.trigger_type || 'rate_spike');
      let t;
      if (typeof editTrigger.threshold === 'string') {
        try {
          t = JSON.parse(editTrigger.threshold);
        } catch {
          console.warn('AddTriggerModal: failed to parse threshold JSON', editTrigger.threshold);
          t = defaultThreshold(editTrigger.trigger_type || 'rate_spike');
        }
      } else {
        t = editTrigger.threshold || defaultThreshold(editTrigger.trigger_type || 'rate_spike');
      }
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
    // Validation
    if (scope !== 'global' && !scopeId.trim()) {
      setSaveError(`${scope === 'provider' ? 'Provider name' : 'Project path'} is required when scope is not global.`);
      return;
    }
    if (action === 'webhook' && !webhookUrl.trim()) {
      setSaveError('Webhook URL is required when action is Webhook.');
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      await onSave({
        scope,
        scope_id: scope === 'global' ? null : (scopeId.trim() || null),
        trigger_type: triggerType,
        threshold,
        action,
        webhook_url: action === 'webhook' ? webhookUrl.trim() : null,
        enabled: true,
      }, editTrigger?.id);
      onClose();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save trigger. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editTrigger ? 'Edit Trigger' : 'Add Trigger'}>
      <div className="space-y-4">
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

        {(triggerType === 'rate_spike' || triggerType === 'cost_spike') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  Multiplier
                  <Tooltip content="How many times higher than normal triggers an alert. 5x means if you normally spend ₹10/hr, alert at ₹50/hr." />
                </span>
              </label>
              <input type="number" className={inputCls} value={threshold.multiplier ?? 5}
                onChange={e => updateThreshold('multiplier', e.target.value)} min={1} step={0.5} />
            </div>
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  Window (minutes)
                  <Tooltip content="How far back to look when checking for spikes. 60 means compare the last hour to your historical average." />
                </span>
              </label>
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

        <div>
          <label className={labelCls}>Action</label>
          <select className={inputCls} value={action} onChange={e => setAction(e.target.value)}>
            {ACTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <p className="text-text-muted text-xs mt-1">
            {ACTIONS.find(a => a.value === action)?.desc}
          </p>
        </div>

        {action === 'webhook' && (
          <div>
            <label className={labelCls}>Webhook URL</label>
            <input className={inputCls} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/..." />
          </div>
        )}

        {saveError && (
          <p className="text-error text-sm">{saveError}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving\u2026' : editTrigger ? 'Update Trigger' : 'Add Trigger'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AddTriggerModal;
