import React from 'react';
import Card from '../common/Card';
import { formatINR, formatUSD, formatPercent } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';

function BudgetProgress({ current, limit, label, currency }) {
  const { state } = useApp();
  const displayCurrency = currency || state.currency;

  const percentage = limit > 0 ? (current / limit) * 100 : 0;

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

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-baseline justify-between mb-4">
          <div className="text-text-primary font-medium">{label || 'Budget'}</div>
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
          <div className={`mt-3 text-xs ${getTextColor()} font-medium`}>
            {percentage >= 100 ? '⚠️ Budget exceeded!' : '⚠️ Approaching budget limit'}
          </div>
        )}
      </div>
    </Card>
  );
}

export default BudgetProgress;
