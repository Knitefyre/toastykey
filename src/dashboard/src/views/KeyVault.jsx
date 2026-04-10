import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Tooltip from '../components/common/Tooltip';
import KeyTable from '../components/vault/KeyTable';
import AddKeyModal from '../components/vault/AddKeyModal';
import { getKeys, addKey, deleteKey, revealKey } from '../services/api';
import { useToast } from '../contexts/ToastContext';

function KeyVault() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
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
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Key
        </Button>
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
    </div>
  );
}

export default KeyVault;
