import React, { useEffect, useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Tooltip from '../components/common/Tooltip';
import KeyTable from '../components/vault/KeyTable';
import AddKeyModal from '../components/vault/AddKeyModal';
import { getKeys, addKey, deleteKey, revealKey, importEnv } from '../services/api';
import { useToast } from '../contexts/ToastContext';

function KeyVault() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [envContent, setEnvContent] = useState('');
  const [foundKeys, setFoundKeys] = useState([]);
  const [importing, setImporting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const result = await getKeys();
      setKeys(result.keys || []);
    } catch (err) {
      console.error('Failed to load keys:', err);
      showToast('Failed to load keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (keyData) => {
    try {
      await addKey(keyData);
      await loadKeys();
      showToast('Key added successfully', 'success');
    } catch (err) {
      console.error('Failed to add key:', err);
      showToast('Failed to add key', 'error');
    }
  };

  const handleDeleteKey = async (keyId) => {
    try {
      await deleteKey(keyId);
      await loadKeys();
      showToast('Key deleted', 'success');
    } catch (err) {
      console.error('Failed to delete key:', err);
      showToast('Failed to delete key', 'error');
    }
  };

  const handleRevealKey = async (keyId) => {
    const result = await revealKey(keyId);
    return result;
  };

  const handleParseEnv = async () => {
    if (!envContent.trim()) {
      showToast('Please paste .env content', 'error');
      return;
    }

    try {
      const result = await importEnv(envContent);
      setFoundKeys(result.found_keys || []);
      if (result.found_keys.length === 0) {
        showToast('No API keys found in .env content', 'warning');
      }
    } catch (err) {
      showToast('Failed to parse .env content', 'error');
    }
  };

  const handleImportKeys = async () => {
    setImporting(true);
    try {
      for (const key of foundKeys) {
        await addKey(key);
      }
      showToast(`Imported ${foundKeys.length} key(s)`, 'success');
      setShowImportModal(false);
      setEnvContent('');
      setFoundKeys([]);
      await loadKeys();
    } catch (err) {
      showToast('Failed to import keys', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-text-primary">Key Vault</h1>
            <Tooltip content="Your API keys are encrypted locally with AES-256-GCM and never leave your machine. ToastyKey uses these keys to proxy API calls and track costs." />
          </div>
          <p className="text-text-secondary">
            Securely manage your API keys with AES-256-GCM encryption
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import from .env
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Key
          </Button>
        </div>
      </div>

      {/* Key Table */}
      <Card>
        <div className="p-6">
          <KeyTable
            keys={keys}
            loading={loading}
            onDelete={handleDeleteKey}
            onReveal={handleRevealKey}
          />
        </div>
      </Card>

      {/* Add Key Modal */}
      <AddKeyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddKey}
      />

      {/* Import from .env Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setEnvContent('');
          setFoundKeys([]);
        }}
        title="Import from .env"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Paste .env file content
            </label>
            <textarea
              className="w-full h-48 px-3 py-2 bg-bg-base border border-border rounded-md text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-success resize-none"
              placeholder="OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-..."
              value={envContent}
              onChange={(e) => setEnvContent(e.target.value)}
            />
          </div>

          {foundKeys.length === 0 ? (
            <Button variant="primary" onClick={handleParseEnv} className="w-full">
              Parse Keys
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="bg-bg-surface border border-border rounded-md p-3">
                <p className="text-sm text-text-secondary mb-2">Found {foundKeys.length} key(s):</p>
                {foundKeys.map((key, idx) => (
                  <div key={idx} className="text-sm text-text-primary font-mono">
                    {key.provider}: {key.key.substring(0, 15)}...
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEnvContent('');
                    setFoundKeys([]);
                  }}
                  className="flex-1"
                >
                  Reset
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImportKeys}
                  disabled={importing}
                  className="flex-1"
                >
                  {importing ? 'Importing...' : `Import ${foundKeys.length} Key(s)`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default KeyVault;
