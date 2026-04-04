import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Skeleton from '../common/Skeleton';

function BarChart({
  data,
  dataKeys = [],
  xAxisKey = 'name',
  colors = ['#22C55E'],
  horizontal = false,
  loading,
  height = 300,
  formatXAxis,
  formatYAxis,
  formatTooltip,
  renderCell
}) {
  if (loading) {
    return <Skeleton variant="card" style={{ height: `${height}px` }} />;
  }

  const layout = horizontal ? 'horizontal' : 'vertical';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} layout={layout}>
        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
        {horizontal ? (
          <>
            <XAxis
              type="number"
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
              tickFormatter={formatXAxis}
            />
            <YAxis
              type="category"
              dataKey={xAxisKey}
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
              tickFormatter={formatYAxis}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xAxisKey}
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
              tickFormatter={formatXAxis}
            />
            <YAxis
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
              tickFormatter={formatYAxis}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: '#1B2336',
            border: '1px solid #475569',
            borderRadius: '0.5rem',
            color: '#F8FAFC'
          }}
          formatter={formatTooltip}
        />
        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[index % colors.length]}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          >
            {renderCell &&
              data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={renderCell(entry, idx)} />
              ))}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

export default BarChart;
