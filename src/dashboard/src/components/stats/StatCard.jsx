import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Skeleton from '../common/Skeleton';
import Tooltip from '../common/Tooltip';
import { formatINR, formatUSD, formatNumber } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';

function StatCard({ value, label, delta, loading, type = 'number', tooltip, icon: Icon }) {
  const { state } = useApp();

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
        <Skeleton className="h-7 w-24 mb-2.5 rounded-lg" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>
    );
  }

  const formatValue = () => {
    if (type === 'currency') {
      return state.currency === 'INR' ? formatINR(value) : formatUSD(value);
    }
    return formatNumber(value);
  };

  const deltaAbs = Math.abs(delta ?? 0);
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const isNeutral  = !delta;

  const deltaColor = isPositive ? 'text-accent-green' : isNegative ? 'text-accent-red' : 'text-white/30';
  const DeltaIcon  = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
      {/* Top row: icon + delta */}
      <div className="flex items-center justify-between mb-3">
        {Icon
          ? <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
              <Icon className="w-4 h-4 text-white/40" />
            </div>
          : <div />
        }
        {delta !== undefined && delta !== null && (
          <div className={`flex items-center gap-1 text-[11px] font-medium ${deltaColor}`}>
            <DeltaIcon className="w-3 h-3" />
            {!isNeutral && <span>{deltaAbs}%</span>}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="font-mono text-[26px] font-semibold text-white/90 tabular-nums leading-none mb-1.5">
        {formatValue()}
      </div>

      {/* Label */}
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] text-white/40">{label}</span>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
    </div>
  );
}

export default StatCard;
