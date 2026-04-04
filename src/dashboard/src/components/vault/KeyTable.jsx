import React, { useState } from 'react';
import { Eye, EyeOff, Trash2, Key as KeyIcon, Copy } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { maskApiKey, formatRelativeTime, formatINR } from '../../services/formatters';
import { useToast } from '../../contexts/ToastContext';

function KeyTable({ keys, loading, onDelete, onReveal }) {
  const [revealedKeys, setRevealedKeys] = useState({});
  const { showToast } = useToast();

  const handleReveal = async (keyId) => {
    try {
      const result = await onReveal(keyId);
      if (result && result.key) {
        setRevealedKeys({ ...revealedKeys, [keyId]: result.key });

        // Auto-mask after 10 seconds
        setTimeout(() => {
          setRevealedKeys((prev) => {
            const updated = { ...prev };
            delete updated[keyId];
            return updated;
          });
        }, 10000);

        showToast('Key revealed for 10 seconds', 'info');
      }
    } catch (error) {
      showToast('Failed to reveal key', 'error');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  const handleDelete = async (keyId, provider) => {
    if (confirm(`Delete ${provider} API key? This cannot be undone.`)) {
      try {
        await onDelete(keyId);
        showToast('API key deleted', 'success');
      } catch (error) {
        showToast('Failed to delete key', 'error');
      }
    }
  };

  if (keys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-bg-surface border border-border rounded-md">
        <KeyIcon className="w-12 h-12 text-text-muted mb-4" />
        <div className="text-text-primary font-medium mb-2">No API keys stored</div>
        <div className="text-text-secondary text-sm mb-4">
          Add your first API key to get started
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-text-secondary text-sm font-medium px-4 py-3">Provider</th>
            <th className="text-left text-text-secondary text-sm font-medium px-4 py-3">Label</th>
            <th className="text-left text-text-secondary text-sm font-medium px-4 py-3">Key</th>
            <th className="text-left text-text-secondary text-sm font-medium px-4 py-3">Status</th>
            <th className="text-left text-text-secondary text-sm font-medium px-4 py-3">Last Used</th>
            <th className="text-left text-text-secondary text-sm font-medium px-4 py-3">Calls</th>
            <th className="text-left text-text-secondary text-sm font-medium px-4 py-3">Cost</th>
            <th className="text-right text-text-secondary text-sm font-medium px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const providerVariant = key.provider === 'openai' ? 'success' : key.provider === 'anthropic' ? 'warning' : 'default';
            const statusVariant = key.status === 'active' ? 'success' : 'default';
            const isRevealed = revealedKeys[key.id];
            const displayKey = isRevealed || maskApiKey(key.masked_key || key.key);

            return (
              <tr key={key.id} className="border-b border-border hover:bg-bg-hover">
                <td className="px-4 py-3">
                  <Badge variant={providerVariant} size="sm">
                    {key.provider}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-text-primary">{key.label}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="text-text-primary font-code text-sm">{displayKey}</code>
                    {isRevealed && (
                      <button
                        onClick={() => handleCopy(isRevealed)}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant} size="sm">
                    {key.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-text-secondary text-sm">
                  {key.usage?.last_used ? formatRelativeTime(key.usage.last_used) : 'Never'}
                </td>
                <td className="px-4 py-3 text-text-primary font-code text-sm">
                  {key.usage?.call_count || 0}
                </td>
                <td className="px-4 py-3 text-text-primary font-code text-sm">
                  {formatINR(key.usage?.total_cost || 0, { compact: true })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleReveal(key.id)}
                      className="text-text-secondary hover:text-info transition-colors p-1"
                      title="Reveal key"
                    >
                      {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(key.id, key.provider)}
                      className="text-text-secondary hover:text-error transition-colors p-1"
                      title="Delete key"
                    >
                      <Trash2 className="w-4 h-4" />
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
