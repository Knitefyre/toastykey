import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import KeyTable from '../components/vault/KeyTable';
import AddKeyModal from '../components/vault/AddKeyModal';
import { getKeys, addKey, deleteKey, revealKey } from '../services/api';

function KeyVault() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const result = await getKeys();
      setKeys(result.keys || []);
    } catch (error) {
      console.error('Failed to load keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (keyData) => {
    await addKey(keyData);
    await loadKeys();
  };

  const handleDeleteKey = async (keyId) => {
    await deleteKey(keyId);
    await loadKeys();
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
          <h1 className="text-2xl font-bold text-text-primary mb-2">Key Vault</h1>
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
