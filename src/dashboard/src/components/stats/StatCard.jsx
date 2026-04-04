import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from '../common/Card';
import Skeleton from '../common/Skeleton';
import { formatINR, formatUSD, formatNumber } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';

function StatCard({ value, label, delta, loading, type = 'number' }) {
  const { state } = useApp();
  const currency = state.currency;

  if (loading) {
    return (
      <Card>
        <div className="p-6">
          <Skeleton variant="text" className="h-8 w-24 mb-2" />
          <Skeleton variant="text" className="h-4 w-32" />
        </div>
      </Card>
    );
  }

  const formatValue = () => {
    if (type === 'currency') {
      return currency === 'INR' ? formatINR(value) : formatUSD(value);
    }
    return formatNumber(value);
  };

  const deltaColor = delta > 0 ? 'text-success' : delta < 0 ? 'text-error' : 'text-text-secondary';
  const DeltaIcon = delta > 0 ? TrendingUp : TrendingDown;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-4xl font-code font-bold text-text-primary">
            {formatValue()}
          </div>
          {delta !== undefined && delta !== null && (
            <div className={`flex items-center gap-1 text-sm font-medium ${deltaColor}`}>
              <DeltaIcon className="w-4 h-4" />
              <span>{Math.abs(delta)}%</span>
            </div>
          )}
        </div>
        <div className="text-text-secondary text-sm">
          {label}
        </div>
      </div>
    </Card>
  );
}

export default StatCard;
