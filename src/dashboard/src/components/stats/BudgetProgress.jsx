import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldOff } from 'lucide-react';
import Button from '../common/Button';
import Tooltip from '../common/Tooltip';
import { formatINR, formatUSD, formatPercent } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useToast } from '../../contexts/ToastContext';
import { overrideBudget } from '../../services/api';

function BudgetProgress({ current, limit, label, currency, budgetId }) {
  const { state } = useApp();
  const { socket } = useWebSocket();
  const { showToast } = useToast();
  const displayCurrency = currency || state.currency;
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overriding, setOverriding] = useState(false);

  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;

  useEffect(() => {
    if (!socket) return;
    const onWarning  = () => showToast('Budget warning: 80% of limit reached', 'warning');
    const onExceeded = () => showToast('Budget exceeded! API calls are blocked', 'error');
    socket.on('budget_warning', onWarning);
    socket.on('budget_exceeded', onExceeded);
    return () => { socket.off('budget_warning', onWarning); socket.off('budget_exceeded', onExceeded); };
  }, [socket, showToast]);

  const barColor = percentage < 60
    ? 'bg-accent-green'
    : percentage < 80
    ? 'bg-accent-amber'
    : 'bg-accent-red';

  const textColor = percentage < 60
    ? 'text-accent-green'
    : percentage < 80
    ? 'text-accent-amber'
    : 'text-accent-red';

  const formatCurrency = (v) =>
    displayCurrency === 'INR' ? formatINR(v) : formatUSD(v);

  const handleOverride = async (newLimit, hours) => {
    if (!budgetId) { showToast('Cannot override: budget ID not provided', 'error'); return; }
    setOverriding(true);
    try {
      await overrideBudget(budgetId, newLimit, hours);
      showToast(`Budget overridden to ${formatCurrency(newLimit)} for ${hours}h`, 'success');
      setShowOverrideModal(false);
      window.location.reload();
    } catch (err) {
      showToast(err.message || 'Failed to override budget', 'error');
    } finally { setOverriding(false); }
  };

  const OverrideModal = () => {
    const [newLimit, setNewLimit] = useState(limit * 1.5);
    const [hours, setHours] = useState(24);
    if (!showOverrideModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={() => setShowOverrideModal(false)}>
        <div className="bg-white/[0.04] border border-white/[0.1] backdrop-blur-xl rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
          <h2 className="text-[15px] font-semibold text-white/90 mb-5">Override Budget</h2>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-[12px] text-white/40 mb-2">New Limit ({displayCurrency})</label>
              <input
                type="number"
                value={newLimit}
                onChange={e => setNewLimit(parseFloat(e.target.value))}
                className="input-base"
                min={current}
                step={displayCurrency === 'INR' ? 100 : 1}
              />
            </div>
            <div>
              <label className="block text-[12px] text-white/40 mb-2">Duration (hours)</label>
              <input
                type="number"
                value={hours}
                onChange={e => setHours(parseInt(e.target.value))}
                className="input-base"
                min={1}
                max={168}
              />
              <p className="text-[11px] text-white/25 mt-1.5">
                Reverts to {formatCurrency(limit)} after {hours}h
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowOverrideModal(false)} disabled={overriding}>Cancel</Button>
            <Button variant="warning" onClick={() => handleOverride(newLimit, hours)} disabled={overriding || newLimit <= current}>
              {overriding ? 'Overriding...' : 'Override'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <OverrideModal />
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] text-white/70 font-medium">
            {label || 'Budget'}
            <Tooltip content="Spending progress toward your budget limit. At 80% you'll get a warning. At 100% API calls are blocked." />
          </div>
          <span className={`font-mono text-[13px] font-semibold tabular-nums ${textColor}`}>
            {formatPercent(percentage)}
          </span>
        </div>

        {/* Bar — 4px height, very refined */}
        <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mb-3">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Labels */}
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-white/30">
            {formatCurrency(current)}
            <span className="text-white/15 mx-1">/</span>
            {formatCurrency(limit)}
          </span>
          {percentage >= 80 && percentage < 100 && (
            <div className="flex items-center gap-1 text-accent-amber">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[11px]">Near limit</span>
            </div>
          )}
          {percentage >= 100 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-accent-red">
                <ShieldOff className="w-3 h-3" />
                <span className="text-[11px]">Blocked</span>
              </div>
              {budgetId && (
                <Button variant="warning" size="sm" onClick={() => setShowOverrideModal(true)}>
                  Override
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default BudgetProgress;
