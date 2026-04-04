import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useToast } from '../../contexts/ToastContext';

function AddKeyModal({ isOpen, onClose, onSuccess }) {
  const [provider, setProvider] = useState('openai');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { showToast } = useToast();

  const validate = () => {
    const newErrors = {};

    if (!label.trim()) {
      newErrors.label = 'Label is required';
    }

    if (!apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    } else if (!apiKey.startsWith('sk-')) {
      newErrors.apiKey = 'API key must start with sk-';
    } else if (apiKey.length < 20) {
      newErrors.apiKey = 'API key appears to be invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await onSuccess({ provider, label, key: apiKey });
      showToast('API key added successfully', 'success');
      handleClose();
    } catch (error) {
      showToast(error.message || 'Failed to add API key', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProvider('openai');
    setLabel('');
    setApiKey('');
    setShowKey(false);
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add API Key">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider */}
        <div>
          <label className="block text-text-primary text-sm font-medium mb-2">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full bg-bg-surface border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-success"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Label */}
        <div>
          <label className="block text-text-primary text-sm font-medium mb-2">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., default, production"
            className={`w-full bg-bg-surface border ${
              errors.label ? 'border-error' : 'border-border'
            } rounded-md px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-success`}
          />
          {errors.label && (
            <p className="text-error text-xs mt-1">{errors.label}</p>
          )}
        </div>

        {/* API Key */}
        <div>
          <label className="block text-text-primary text-sm font-medium mb-2">
            API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className={`w-full bg-bg-surface border ${
                errors.apiKey ? 'border-error' : 'border-border'
              } rounded-md px-3 py-2 pr-10 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-success font-code`}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.apiKey && (
            <p className="text-error text-xs mt-1">{errors.apiKey}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
          >
            Add Key
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default AddKeyModal;
