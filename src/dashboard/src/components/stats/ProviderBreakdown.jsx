import React from 'react';
import Card from '../common/Card';
import Skeleton from '../common/Skeleton';
import { formatINR, formatUSD } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';
import { getColor } from '../../utils/providerColors';

function ProviderBreakdown({ data, loading }) {
  const { state } = useApp();
  const currency = state.currency;

  const fmt = (v) => currency === 'INR' ? formatINR(v, { compact: true }) : formatUSD(v);

  if (loading) {
    return (
      <Card title="Provider Breakdown" tooltip="Spending per AI provider.">
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton.Row key={i} />)}
        </div>
      </Card>
    );
  }

  // API returns `total_inr` / `total_usd` (global endpoint) or
  // `cost_inr` / `cost_usd` (project-detail endpoint) — normalise to `amount`
  const normalised = (data || []).map(p => ({
    ...p,
    amount: currency === 'INR'
      ? (p.total_inr ?? p.cost_inr ?? p.amount ?? 0)
      : (p.total_usd ?? p.cost_usd ?? p.amount ?? 0),
  }));
  const sorted = [...normalised].sort((a, b) => b.amount - a.amount);
  const total  = sorted.reduce((s, p) => s + (p.amount || 0), 0);

  if (sorted.length === 0) {
    return (
      <Card title="Provider Breakdown" tooltip="Spending per AI provider.">
        <p className="text-[13px] text-white/25 text-center py-6">No provider data yet</p>
      </Card>
    );
  }

  return (
    <Card title="Provider Breakdown" tooltip="How much you're spending with each AI provider.">
      <div className="space-y-4">
        {sorted.map((item) => {
          const pct   = total > 0 ? (item.amount / total) * 100 : 0;
          const color = getColor(item.provider);
          return (
            <div key={item.provider}>
              <div className="flex items-center justify-between mb-1.5 text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-white/70 font-medium">{item.provider}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="font-mono text-white/60 tabular-nums">{fmt(item.amount)}</span>
                  <span className="text-white/25 w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              </div>
              {/* Bar */}
              <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default ProviderBreakdown;
