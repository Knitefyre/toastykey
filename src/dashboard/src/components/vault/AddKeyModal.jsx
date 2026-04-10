import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useToast } from '../../contexts/ToastContext';

const PROVIDERS = [
  { value: 'openai',    label: 'OpenAI'    },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'custom',    label: 'Custom'    },
];

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-white/50 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[11px] text-accent-red mt-1">{error}</p>}
    </div>
  );
}

function AddKeyModal({ isOpen, onClose, onSuccess }) {
  const [provider, setProvider] = useState('openai');
  const [label, setLabel]       = useState('');
  const [apiKey, setApiKey]     = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});
  const { showToast } = useToast();

  const validate = () => {
    const e = {};
    if (!label.trim()) e.label = 'Label is required';
    if (!apiKey.trim()) e.apiKey = 'API key is required';
    else if (!apiKey.startsWith('sk-')) e.apiKey = 'API key must start with sk-';
    else if (apiKey.length < 20) e.apiKey = 'API key appears to be too short';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSuccess({ provider, label, key: apiKey });
      handleClose();
    } catch (err) {
      showToast(err.message || 'Failed to add API key', 'error');
    } finally { setLoading(false); }
  };

  const handleClose = () => {
    setProvider('openai'); setLabel(''); setApiKey('');
    setShowKey(false); setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add API Key" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">

        <Field label="Provider">
          <select
            value={provider}
            onChange={e => setProvider(e.target.value)}
            className="input-base"
          >
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>

        <Field label="Label" error={errors.label}>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g., default, production"
            className={`input-base ${errors.label ? 'border-accent-red/50' : ''}`}
          />
        </Field>

        <Field label="API Key" error={errors.apiKey}>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              className={`input-base pr-10 font-mono ${errors.apiKey ? 'border-accent-red/50' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowKey(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={loading}>
            Add Key
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default AddKeyModal;
