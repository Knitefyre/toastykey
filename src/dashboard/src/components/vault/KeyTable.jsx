import React, { useState } from 'react';
import { Eye, EyeOff, Trash2, Key as KeyIcon, Copy } from 'lucide-react';
import Badge from '../common/Badge';
import Tooltip from '../common/Tooltip';
import { maskApiKey, formatRelativeTime, formatINR } from '../../services/formatters';
import { useToast } from '../../contexts/ToastContext';

const PROVIDER_VARIANT = { openai: 'success', anthropic: 'warning' };
const STATUS_TOOLTIP = {
  active:   'Key is working — last API call succeeded',
  expired:  'Key failed with 401/403 — check if it expired or was revoked',
  inactive: "Key hasn't been used in the last 30 days",
};

function KeyTable({ keys, loading, onDelete, onReveal }) {
  const [revealed, setRevealed] = useState({});
  const { showToast } = useToast();

  const handleReveal = async (keyId) => {
    try {
      const result = await onReveal(keyId);
      if (result?.key) {
        setRevealed(prev => ({ ...prev, [keyId]: result.key }));
        setTimeout(() => setRevealed(prev => { const n = { ...prev }; delete n[keyId]; return n; }), 10000);
        showToast('Key revealed for 10 seconds', 'info');
      }
    } catch { showToast('Failed to reveal key', 'error'); }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  const handleDelete = async (keyId, provider) => {
    if (confirm(`Delete ${provider} API key? This cannot be undone.`)) {
      try { await onDelete(keyId); }
      catch { showToast('Failed to delete key', 'error'); }
    }
  };

  if (keys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
          <KeyIcon className="w-6 h-6 text-white/20" />
        </div>
        <p className="text-[13px] text-white/40 font-medium mb-1">No API keys stored</p>
        <p className="text-[12px] text-white/20">Add your first API key to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-white/[0.05]">
            {['Provider', 'Label', 'Key', 'Status', 'Last Used', 'Calls', 'Cost', ''].map(h => (
              <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-white/25 ${h === '' ? 'text-right' : 'text-left'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map(key => {
            const isRevealed = revealed[key.id];
            const displayKey = isRevealed || maskApiKey(key.masked_key || key.key);

            return (
              <tr key={key.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100 group">
                <td className="px-4 py-3">
                  <Badge variant={PROVIDER_VARIANT[key.provider] ?? 'default'} size="sm" dot>
                    {key.provider}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[13px] text-white/70">{key.label}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-[12px] text-white/50">{displayKey}</code>
                    {isRevealed && (
                      <button onClick={() => handleCopy(isRevealed)} className="text-white/25 hover:text-white/60 transition-colors" title="Copy">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={key.status === 'active' ? 'success' : key.status === 'expired' ? 'error' : 'default'}
                      size="sm" dot
                    >
                      {key.status}
                    </Badge>
                    <Tooltip content={STATUS_TOOLTIP[key.status] ?? ''} />
                  </div>
                </td>
                <td className="px-4 py-3 text-[12px] text-white/35">
                  {key.usage?.last_used ? formatRelativeTime(key.usage.last_used) : 'Never'}
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-white/50 tabular-nums">
                  {key.usage?.call_count || 0}
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-white/50 tabular-nums">
                  {formatINR(key.usage?.total_cost || 0, { compact: true })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleReveal(key.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-accent-blue hover:bg-white/[0.05] transition-all"
                      title={isRevealed ? 'Hide key' : 'Reveal key'}
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(key.id, key.provider)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-accent-red hover:bg-white/[0.05] transition-all"
                      title="Delete key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default KeyTable;
