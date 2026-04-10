import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../common/Card';
import Skeleton from '../common/Skeleton';
import { formatINR, formatUSD } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';

const ACCENT = '#34D399'; // accent-green

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  const formatted = currency === 'INR' ? formatINR(value) : formatUSD(value);
  return (
    <div className="bg-[#1a1a1f] border border-white/[0.1] rounded-xl px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <p className="text-[11px] text-white/40 mb-1">{label}</p>
      <p className="text-[13px] font-mono font-semibold text-white/90 tabular-nums">{formatted}</p>
    </div>
  );
}

function SpendChart({ data, loading }) {
  const { state } = useApp();
  const currency = state.currency;
  const dataKey = currency === 'INR' ? 'total_inr' : 'total_usd';

  if (loading) {
    return (
      <Card title="Spend Trend (30 Days)" tooltip="Daily API spending over the last 30 days.">
        <Skeleton className="h-56 rounded-xl" />
      </Card>
    );
  }

  return (
    <Card title="Spend Trend (30 Days)" tooltip="Daily API spending over the last 30 days. Spot patterns and unusual spikes.">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={ACCENT} stopOpacity={0.2} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0}   />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => currency === 'INR' ? formatINR(v, { compact: true }) : formatUSD(v)}
          />
          <Tooltip
            content={<CustomTooltip currency={currency} />}
            cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#spendGradient)"
            dot={false}
            activeDot={{ r: 4, fill: ACCENT, stroke: '#09090B', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default SpendChart;
