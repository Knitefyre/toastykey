import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldOff } from 'lucide-react';
import Card from '../common/Card';
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

  const percentage = limit > 0 ? (current / limit) * 100 : 0;

  // WebSocket listeners for budget events
  useEffect(() => {
    if (!socket) return;

    const handleBudgetWarning = (data) => {
      console.log('[WebSocket] Budget warning:', data);
      showToast('Budget warning: 80% of limit reached', 'warning');
    };

    const handleBudgetExceeded = (data) => {
      console.log('[WebSocket] Budget exceeded:', data);
      showToast('Budget exceeded! API calls are blocked', 'error');
    };

    socket.on('budget_warning', handleBudgetWarning);
    socket.on('budget_exceeded', handleBudgetExceeded);

    return () => {
      socket.off('budget_warning', handleBudgetWarning);
      socket.off('budget_exceeded', handleBudgetExceeded);
    };
  }, [socket, showToast]);

  // Dynamic color based on percentage
  const getColor = () => {
    if (percentage < 60) return 'bg-success';
    if (percentage < 80) return 'bg-warning';
    return 'bg-error';
  };

  const getTextColor = () => {
    if (percentage < 60) return 'text-success';
    if (percentage < 80) return 'text-warning';
    return 'text-error';
  };

  const formatCurrency = (value) => {
    return displayCurrency === 'INR' ? formatINR(value) : formatUSD(value);
  };

  const handleOverride = async (newLimit, hours) => {
    if (!budgetId) {
      showToast('Cannot override: budget ID not provided', 'error');
      return;
    }
    setOverriding(true);
    try {
      await overrideBudget(budgetId, newLimit, hours);
      showToast(`Budget overridden to ${formatCurrency(newLimit)} for ${hours}h`, 'success');
      setShowOverrideModal(false);
      // Trigger a page reload or data refresh
      window.location.reload();
    } catch (err) {
      showToast(err.message || 'Failed to override budget', 'error');
    } finally {
      setOverriding(false);
    }
  };

  // Override Budget Modal Component
  const OverrideBudgetModal = () => {
    const [newLimit, setNewLimit] = useState(limit * 1.5);
    const [hours, setHours] = useState(24);

    if (!showOverrideModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowOverrideModal(false)}>
        <div className="bg-bg-surface border border-border rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold text-text-primary mb-4">Override Budget</h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                New Limit ({displayCurrency})
              </label>
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-bg-base border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-success"
                min={current}
                step={displayCurrency === 'INR' ? 100 : 1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Duration (hours)
              </label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-bg-base border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-success"
                min={1}
                max={168}
              />
              <p className="text-xs text-text-muted mt-1">
                Override will expire after {hours} hours and revert to {formatCurrency(limit)}
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowOverrideModal(false)}
              disabled={overriding}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleOverride(newLimit, hours)}
              disabled={overriding || newLimit <= current}
            >
              {overriding ? 'Overriding...' : 'Override Budget'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <OverrideBudgetModal />
      <Card>
        <div className="p-6">
        <div className="flex items-baseline justify-between mb-4">
          <div className="flex items-center gap-2 text-text-primary font-medium">
            <span>{label || 'Budget'}</span>
            <Tooltip content="Shows your spending progress. At 80% you'll get a warning. At 100% all API calls are blocked until the budget period resets." />
          </div>
          <div className={`text-sm font-code font-bold ${getTextColor()}`}>
            {formatPercent(Math.min(percentage, 100))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-bg-hover rounded-full h-3 mb-3 overflow-hidden">
          <div
            className={`h-full ${getColor()} transition-all duration-300 rounded-full`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        {/* Current / Limit labels */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            Current: <span className="text-text-primary font-medium">{formatCurrency(current)}</span>
          </span>
          <span className="text-text-secondary">
            Limit: <span className="text-text-primary font-medium">{formatCurrency(limit)}</span>
          </span>
        </div>

        {percentage >= 80 && (
          <div className="mt-4 pt-3 border-t border-border">
            {percentage >= 100 ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldOff className="w-4 h-4 text-error" />
                  <span className="text-error font-medium text-sm">
                    Budget exceeded — API calls blocked
                  </span>
                </div>
                {budgetId && (
                  <Button
                    variant="warning"
                    size="small"
                    onClick={() => setShowOverrideModal(true)}
                  >
                    Override
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-warning font-medium text-sm">
                  Approaching budget limit
                </span>
              </div>
            )}
          </div>
        )}
        </div>
      </Card>
    </>
  );
}

export default BudgetProgress;
