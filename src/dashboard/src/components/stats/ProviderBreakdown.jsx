import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Card from '../common/Card';
import Skeleton from '../common/Skeleton';
import { formatINR, formatUSD, formatPercent } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';
import { getColor } from '../../utils/providerColors';

function ProviderBreakdown({ data, loading }) {
  const { state } = useApp();
  const currency = state.currency;

  if (loading) {
    return (
      <Card title="Provider Breakdown">
        <div className="p-6">
          <Skeleton variant="card" className="h-64" />
        </div>
      </Card>
    );
  }

  // Sort descending by amount
  const sortedData = [...(data || [])].sort((a, b) => b.amount - a.amount);

  const formatCurrency = (value) => {
    return currency === 'INR' ? formatINR(value, { compact: true }) : formatUSD(value);
  };

  return (
    <Card title="Provider Breakdown">
      <div className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sortedData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis
              type="number"
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <YAxis
              type="category"
              dataKey="provider"
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1B2336',
                border: '1px solid #475569',
                borderRadius: '0.5rem',
                color: '#F8FAFC'
              }}
              formatter={(value, name) => [formatCurrency(value), 'Spend']}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.provider)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {sortedData.map((item) => (
            <div key={item.provider} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: getColor(item.provider) }}
                />
                <span className="text-text-primary font-medium">{item.provider}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-text-secondary">{formatCurrency(item.amount)}</span>
                <span className="text-text-muted">{formatPercent(item.percentage)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default ProviderBreakdown;
