import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import Badge from '../common/Badge';

const TRIGGER_TYPE_LABELS = {
  rate_spike:      { label: 'Rate Spike',      color: 'warning' },
  cost_spike:      { label: 'Cost Spike',      color: 'error' },
  error_storm:     { label: 'Error Storm',     color: 'error' },
  token_explosion: { label: 'Token Explosion', color: 'warning' },
  silent_drain:    { label: 'Silent Drain',    color: 'info' },
  new_provider:    { label: 'New Provider',    color: 'info' },
};

const ACTION_LABELS = {
  log_only:          { label: 'Log Only',       color: 'default' },
  dashboard_notify:  { label: 'Notify',         color: 'info' },
  claude_code_alert: { label: 'Claude Alert',   color: 'info' },
  auto_pause:        { label: 'Auto Pause',     color: 'warning' },
  auto_kill:         { label: 'Auto Kill',      color: 'error' },
  webhook:           { label: 'Webhook',        color: 'default' },
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
  let threshold = trigger.threshold;
  if (typeof trigger.threshold === 'string') {
    try {
      threshold = JSON.parse(trigger.threshold);
    } catch {
      console.warn('TriggerCard: failed to parse threshold JSON', trigger.threshold);
      threshold = null;
    }
  }

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
