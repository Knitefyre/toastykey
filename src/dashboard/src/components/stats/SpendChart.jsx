import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../common/Card';
import Skeleton from '../common/Skeleton';
import { formatINR, formatUSD } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';

function SpendChart({ data, loading }) {
  const { state } = useApp();
  const currency = state.currency;

  if (loading) {
    return (
      <Card
        title="Spend Trend (30 Days)"
        tooltip="Shows your daily API spending over the last 30 days. Helps you spot patterns and unusual spikes."
      >
        <div className="p-6">
          <Skeleton variant="card" className="h-64" />
        </div>
      </Card>
    );
  }

  const formatCurrency = (value) => {
    return currency === 'INR' ? formatINR(value, { compact: true }) : formatUSD(value);
  };

  return (
    <Card
      title="Spend Trend (30 Days)"
      tooltip="Shows your daily API spending over the last 30 days. Helps you spot patterns and unusual spikes."
    >
      <div className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis
              dataKey="date"
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1B2336',
                border: '1px solid #475569',
                borderRadius: '0.5rem',
                color: '#F8FAFC'
              }}
              formatter={formatCurrency}
            />
            <Area
              type="monotone"
              dataKey={currency === 'INR' ? 'total_inr' : 'total_usd'}
              stroke="#22C55E"
              fillOpacity={1}
              fill="url(#colorTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default SpendChart;
