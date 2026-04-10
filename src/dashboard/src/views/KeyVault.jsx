import React, { useEffect, useState } from 'react';
import { Plus, Upload, Search, FolderSearch, Check, X } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Tooltip from '../components/common/Tooltip';
import Skeleton from '../components/common/Skeleton';
import Badge from '../components/common/Badge';
import KeyTable from '../components/vault/KeyTable';
import AddKeyModal from '../components/vault/AddKeyModal';
import { getKeys, addKey, deleteKey, revealKey, importEnv, scanEnvFiles } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const PROVIDER_COLORS = {
  openai:     'text-accent-green',
  anthropic:  'text-accent-amber',
  elevenlabs: 'text-accent-purple',
  stability:  'text-accent-blue',
  replicate:  'text-accent-red',
  groq:       'text-accent-green',
  cohere:     'text-accent-blue',
  mistral:    'text-accent-amber',
  perplexity: 'text-accent-purple',
};

function KeyVault() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAutoDetectModal, setShowAutoDetectModal] = useState(false);
  const [envContent, setEnvContent] = useState('');
  const [foundKeys, setFoundKeys] = useState([]);
  const [importing, setImporting] = useState(false);
  // Auto-detect state
  const [scanning, setScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [importingDetected, setImportingDetected] = useState(false);
  const { showToast } = useToast();

  useEffect(() => { loadKeys(); }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const result = await getKeys();
      setKeys(result.keys || []);
    } catch (err) {
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
      showToast('Failed to add key', 'error');
    }
  };

  const handleDeleteKey = async (keyId) => {
    try {
      await deleteKey(keyId);
      await loadKeys();
      showToast('Key deleted', 'success');
    } catch (err) {
      showToast('Failed to delete key', 'error');
    }
  };

  const handleRevealKey = async (keyId) => revealKey(keyId);

  // ── Manual .env import ──────────────────────────────────────────────────────
  const handleParseEnv = async () => {
    if (!envContent.trim()) { showToast('Please paste .env content', 'error'); return; }
    try {
      const result = await importEnv(envContent);
      setFoundKeys(result.found_keys || []);
      if (result.found_keys.length === 0) showToast('No API keys found in .env content', 'warning');
    } catch {
      showToast('Failed to parse .env content', 'error');
    }
  };

  const handleImportKeys = async () => {
    setImporting(true);
    try {
      for (const key of foundKeys) await addKey(key);
      showToast(`Imported ${foundKeys.length} key(s)`, 'success');
      setShowImportModal(false);
      setEnvContent('');
      setFoundKeys([]);
      await loadKeys();
    } catch {
      showToast('Failed to import keys', 'error');
    } finally {
      setImporting(false);
    }
  };

  // ── Auto-detect .env files ──────────────────────────────────────────────────
  const handleAutoDetect = async () => {
    setShowAutoDetectModal(true);
    setScanning(true);
    setScannedFiles([]);
    setSelectedKeys(new Set());
    try {
      const result = await scanEnvFiles();
      setScannedFiles(result.files || []);
      // Pre-select all found keys
      const all = new Set();
      (result.files || []).forEach(f =>
        f.found_keys.forEach((_, i) => all.add(`${f.path}::${i}`))
      );
      setSelectedKeys(all);
      if (result.total_keys === 0) showToast('No API keys found in scanned .env files', 'warning');
    } catch (err) {
      showToast(err.message || 'Scan failed', 'error');
      setShowAutoDetectModal(false);
    } finally {
      setScanning(false);
    }
  };

  const toggleKeySelection = (fileKey) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.has(fileKey) ? next.delete(fileKey) : next.add(fileKey);
      return next;
    });
  };

  const handleImportDetected = async () => {
    const toImport = [];
    scannedFiles.forEach(f =>
      f.found_keys.forEach((k, i) => {
        if (selectedKeys.has(`${f.path}::${i}`)) toImport.push(k);
      })
    );
    if (toImport.length === 0) { showToast('No keys selected', 'error'); return; }
    setImportingDetected(true);
    let imported = 0;
    let failed = 0;
    for (const key of toImport) {
      try { await addKey(key); imported++; }
      catch { failed++; }
    }
    showToast(
      failed === 0
        ? `Imported ${imported} key(s) successfully`
        : `Imported ${imported}, skipped ${failed} (already exist)`,
      failed === 0 ? 'success' : 'warning'
    );
    setShowAutoDetectModal(false);
    setScannedFiles([]);
    setSelectedKeys(new Set());
    await loadKeys();
    setImportingDetected(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-[20px] font-semibold text-white/90 tracking-tight">Key Vault</h1>
            <Tooltip content="Your API keys are encrypted locally with AES-256-GCM and never leave your machine." />
          </div>
          <p className="text-[13px] text-white/35">AES-256-GCM encrypted · local only</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" onClick={handleAutoDetect}>
            <FolderSearch className="w-4 h-4 mr-1.5" />
            Auto-detect .env
          </Button>
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-1.5" />
            Import from .env
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Key
          </Button>
        </div>
      </div>

      {/* Key Table */}
      <Card noPadding>
        <div className="px-6 py-2">
          <KeyTable keys={keys} loading={loading} onDelete={handleDeleteKey} onReveal={handleRevealKey} />
        </div>
      </Card>

      {/* Add Key Modal */}
      <AddKeyModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={handleAddKey} />

      {/* Manual Import from .env Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setEnvContent(''); setFoundKeys([]); }}
        title="Import from .env"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-white/50 mb-1.5">
              Paste .env file content
            </label>
            <textarea
              className="input-base h-48 font-mono text-[12px] resize-none"
              placeholder={'OPENAI_API_KEY=sk-...\nANTHROPIC_API_KEY=sk-ant-...'}
              value={envContent}
              onChange={e => setEnvContent(e.target.value)}
            />
          </div>

          {foundKeys.length === 0 ? (
            <Button variant="primary" onClick={handleParseEnv} className="w-full">
              <Search className="w-4 h-4 mr-2" />
              Parse Keys
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                <p className="text-[12px] text-white/50 mb-2">Found {foundKeys.length} key(s):</p>
                {foundKeys.map((key, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1">
                    <Badge variant="info" size="sm">{key.provider}</Badge>
                    <span className="text-[12px] font-mono text-white/40">{key.key.substring(0, 18)}…</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setEnvContent(''); setFoundKeys([]); }} className="flex-1">
                  Reset
                </Button>
                <Button variant="primary" onClick={handleImportKeys} disabled={importing} className="flex-1">
                  {importing ? 'Importing…' : `Import ${foundKeys.length} Key(s)`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Auto-detect .env Modal */}
      <Modal
        isOpen={showAutoDetectModal}
        onClose={() => { if (!scanning && !importingDetected) { setShowAutoDetectModal(false); setScannedFiles([]); setSelectedKeys(new Set()); } }}
        title="Auto-detect .env Files"
        size="lg"
      >
        <div className="space-y-4">
          {scanning ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-accent-green/30 border-t-accent-green animate-spin" />
              <p className="text-[13px] text-white/40">Scanning your filesystem for .env files…</p>
            </div>
          ) : scannedFiles.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <p className="text-[14px] font-medium text-white/50 mb-1">No API keys found</p>
              <p className="text-[12px] text-white/25">No .env files with recognized provider keys were found in common directories.</p>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-white/40">
                Found {scannedFiles.reduce((s, f) => s + f.found_keys.length, 0)} key(s) in {scannedFiles.length} file(s).
                Deselect any you don't want to import.
              </p>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {scannedFiles.map((file) => (
                  <div key={file.path} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                    <p className="text-[11px] font-mono text-white/30 mb-3 truncate">{file.path}</p>
                    <div className="space-y-2">
                      {file.found_keys.map((key, i) => {
                        const keyId = `${file.path}::${i}`;
                        const selected = selectedKeys.has(keyId);
                        return (
                          <button
                            key={i}
                            onClick={() => toggleKeySelection(keyId)}
                            className={`
                              w-full flex items-center gap-3 p-2.5 rounded-lg text-left
                              border transition-all duration-150
                              ${selected
                                ? 'bg-accent-green/[0.08] border-accent-green/25'
                                : 'bg-white/[0.02] border-white/[0.05] opacity-50'
                              }
                            `}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'bg-accent-green' : 'bg-white/[0.08]'}`}>
                              {selected && <Check className="w-2.5 h-2.5 text-[#09090B]" />}
                            </div>
                            <Badge variant="info" size="sm">{key.provider}</Badge>
                            <span className="text-[11px] text-white/40 font-mono flex-1 truncate">{key.env_key}</span>
                            <span className="text-[11px] font-mono text-white/25">{key.key.substring(0, 14)}…</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    const all = new Set();
                    scannedFiles.forEach(f => f.found_keys.forEach((_, i) => all.add(`${f.path}::${i}`)));
                    const allSelected = all.size === selectedKeys.size;
                    setSelectedKeys(allSelected ? new Set() : all);
                  }}
                  className="text-[12px] text-white/35 hover:text-white/60 transition-colors"
                >
                  {scannedFiles.reduce((s, f) => s + f.found_keys.length, 0) === selectedKeys.size ? 'Deselect all' : 'Select all'}
                </button>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => { setShowAutoDetectModal(false); setScannedFiles([]); setSelectedKeys(new Set()); }}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleImportDetected} disabled={importingDetected || selectedKeys.size === 0}>
                    {importingDetected ? 'Importing…' : `Import ${selectedKeys.size} Key(s)`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default KeyVault;
