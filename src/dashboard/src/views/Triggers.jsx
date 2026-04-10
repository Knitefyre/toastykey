// src/dashboard/src/views/Triggers.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Tooltip from '../components/common/Tooltip';
import TriggerCard from '../components/triggers/TriggerCard';
import AddTriggerModal from '../components/triggers/AddTriggerModal';
import EventLog from '../components/triggers/EventLog';
import PauseBanner from '../components/triggers/PauseBanner';
import Skeleton from '../components/common/Skeleton';
import { useToast } from '../contexts/ToastContext';
import {
  getTriggers, createTrigger, updateTrigger, deleteTrigger,
  getTriggersStatus, resumeEntity,
} from '../services/api';

const TABS = ['global', 'provider', 'project'];

function Triggers() {
  const [triggers, setTriggers] = useState([]);
  const [paused, setPaused] = useState([]);
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editTrigger, setEditTrigger] = useState(null);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [triggersRes, statusRes] = await Promise.all([
        getTriggers(),
        getTriggersStatus(),
      ]);
      setTriggers(triggersRes.triggers || []);
      setPaused(statusRes.paused || []);
    } catch (err) {
      console.error('Failed to load triggers:', err);
      setError('Failed to load triggers. Is the server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredTriggers = triggers.filter(t => t.scope === activeTab);

  const handleSave = async (data, id) => {
    try {
      if (id) {
        await updateTrigger(id, data);
        showToast('Trigger updated', 'success');
      } else {
        await createTrigger(data);
        showToast('Trigger created', 'success');
      }
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save trigger', 'error');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTrigger(id);
      showToast('Trigger deleted', 'success');
      loadData();
    } catch (err) {
      showToast('Failed to delete trigger', 'error');
    }
  };

  const handleToggle = async (id, enabled) => {
    try {
      await updateTrigger(id, { enabled });
      setTriggers(prev => prev.map(t => t.id === id ? { ...t, enabled } : t));
    } catch (err) {
      showToast('Failed to update trigger', 'error');
    }
  };

  const handleEdit = (trigger) => {
    setEditTrigger(trigger);
    setShowModal(true);
  };

  const handleResume = async (entityType, entityId) => {
    try {
      await resumeEntity(entityType, entityId);
      showToast(`Resumed ${entityId}`, 'success');
      loadData();
    } catch (err) {
      showToast('Failed to resume', 'error');
    }
  };

  const openAddModal = () => {
    setEditTrigger(null);
    setShowModal(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-[20px] font-semibold text-white/90 tracking-tight">Anomaly Detection</h1>
            <Tooltip content="Automatically detect unusual patterns in your API usage — cost spikes, error storms, rate spikes, or new providers." />
          </div>
          <p className="text-[13px] text-white/35">Configure triggers to detect and respond to unusual API activity</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button variant="primary" onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add Trigger
          </Button>
        </div>
      </div>

      {/* Pause banner */}
      <PauseBanner paused={paused} onResume={handleResume} />

      {error && (
        <div className="p-4 bg-accent-red/[0.08] border border-accent-red/20 rounded-xl text-accent-red text-[13px] mb-4">{error}</div>
      )}

      {/* Tabs + triggers */}
      <Card>
        <div className="border-b border-white/[0.06] px-6 pt-2">
          <div className="flex gap-6">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-[13px] font-medium capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-accent-green text-accent-green'
                    : 'border-transparent text-white/35 hover:text-white/70'
                }`}
              >
                {tab}
                <span className="ml-1.5 text-[11px] text-white/20">
                  ({triggers.filter(t => t.scope === tab).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : filteredTriggers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[13px] text-white/35 mb-4">No {activeTab} triggers configured</p>
              <Button variant="secondary" size="sm" onClick={openAddModal}>
                <Plus className="w-4 h-4" />
                Add your first trigger
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTriggers.map(trigger => (
                <TriggerCard
                  key={trigger.id}
                  trigger={trigger}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Event Log */}
      <div className="mt-6">
        <Card title="Recent Events">
          <div className="p-6">
            <EventLog />
          </div>
        </Card>
      </div>

      <AddTriggerModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditTrigger(null); }}
        onSave={handleSave}
        editTrigger={editTrigger}
      />
    </div>
  );
}

export default Triggers;
