import React from 'react';
import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Skeleton from '../common/Skeleton';

function AreaChart({
  data,
  dataKey,
  xAxisKey = 'date',
  color = '#22C55E',
  loading,
  height = 300,
  formatYAxis,
  formatTooltip
}) {
  if (loading) {
    return <Skeleton variant="card" style={{ height: `${height}px` }} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
        <XAxis
          dataKey={xAxisKey}
          stroke="#94A3B8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#94A3B8"
          style={{ fontSize: '12px' }}
          tickFormatter={formatYAxis}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1B2336',
            border: '1px solid #475569',
            borderRadius: '0.5rem',
            color: '#F8FAFC'
          }}
          formatter={formatTooltip}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#gradient-${dataKey})`}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

export default AreaChart;
