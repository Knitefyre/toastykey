import React, { useState } from 'react';
import { Key, Upload } from 'lucide-react';
import Button from '../common/Button';
import { addKey, importEnv } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

function KeyImportStep({ onKeysAdded, onSkip }) {
  const [mode, setMode] = useState('manual'); // 'manual' or 'import'
  const [provider, setProvider] = useState('openai');
  const [label, setLabel] = useState('default');
  const [apiKey, setApiKey] = useState('');
  const [envContent, setEnvContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [keysAdded, setKeysAdded] = useState(0);
  const { showToast } = useToast();

  const handleManualAdd = async () => {
    if (!apiKey.trim() || !apiKey.startsWith('sk-')) {
      showToast('Please enter a valid API key', 'error');
      return;
    }

    setLoading(true);
    try {
      await addKey({ provider, label, key: apiKey });
      showToast('API key added successfully', 'success');
      const newCount = keysAdded + 1;
      setKeysAdded(newCount);
      setApiKey('');
    } catch (error) {
      showToast('Failed to add API key', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!envContent.trim()) {
      showToast('Please paste .env file content', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await importEnv(envContent);
      if (result.found_keys && result.found_keys.length > 0) {
        // Add all found keys
        for (const keyData of result.found_keys) {
          await addKey(keyData);
        }
        showToast(`Imported ${result.found_keys.length} API keys`, 'success');
        setKeysAdded(result.found_keys.length);
        setEnvContent('');
      } else {
        showToast('No API keys found in .env content', 'warning');
      }
    } catch (error) {
      showToast('Failed to import keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    onKeysAdded(keysAdded);
  };

  return (
    <div>
      {/* Mode selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            mode === 'manual'
              ? 'bg-success text-bg-primary font-medium'
              : 'bg-bg-surface text-text-secondary hover:text-text-primary'
          }`}
        >
          <Key className="w-4 h-4 inline mr-2" />
          Manual Entry
        </button>
        <button
          onClick={() => setMode('import')}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            mode === 'import'
              ? 'bg-success text-bg-primary font-medium'
              : 'bg-bg-surface text-text-secondary hover:text-text-primary'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Import .env
        </button>
      </div>

      {/* Manual mode */}
      {mode === 'manual' && (
        <div className="space-y-4">
          <div>
            <label className="block text-text-primary text-sm font-medium mb-2">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-bg-surface border border-border rounded-md px-3 py-2 text-text-primary"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div>
            <label className="block text-text-primary text-sm font-medium mb-2">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="default"
              className="w-full bg-bg-surface border border-border rounded-md px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="block text-text-primary text-sm font-medium mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-bg-surface border border-border rounded-md px-3 py-2 text-text-primary font-code"
            />
          </div>
          <Button variant="primary" onClick={handleManualAdd} loading={loading} className="w-full">
            Add Key
          </Button>
        </div>
      )}

      {/* Import mode */}
      {mode === 'import' && (
        <div className="space-y-4">
          <div>
            <label className="block text-text-primary text-sm font-medium mb-2">
              .env File Content
            </label>
            <textarea
              value={envContent}
              onChange={(e) => setEnvContent(e.target.value)}
              placeholder={`OPENAI_API_KEY=sk-...\nANTHROPIC_API_KEY=sk-ant-...`}
              rows={8}
              className="w-full bg-bg-surface border border-border rounded-md px-3 py-2 text-text-primary font-code text-sm"
            />
          </div>
          <Button variant="primary" onClick={handleImport} loading={loading} className="w-full">
            Import Keys
          </Button>
        </div>
      )}

      {/* Status */}
      {keysAdded > 0 && (
        <div className="mt-6 p-4 bg-bg-surface border border-success rounded-md text-center">
          <div className="text-success font-medium">{keysAdded} API key(s) added</div>
        </div>
      )}

      {/* Continue or Skip */}
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onSkip} className="flex-1">
          Skip for now
        </Button>
        {keysAdded > 0 && (
          <Button variant="primary" onClick={handleContinue} className="flex-1">
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

export default KeyImportStep;
