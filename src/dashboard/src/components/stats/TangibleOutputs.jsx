import React from 'react';
import { Image, MessageSquare, Music } from 'lucide-react';
import Card from '../common/Card';
import Skeleton from '../common/Skeleton';
import { formatINR, formatUSD, formatNumber } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';

function TangibleOutputs({ outputs, loading }) {
  const { state } = useApp();
  const currency = state.currency;

  if (loading) {
    return (
      <Card title="Tangible Outputs">
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
        </div>
      </Card>
    );
  }

  const formatCost = (cost) => {
    return currency === 'INR' ? formatINR(cost) : formatUSD(cost);
  };

  const outputCards = [
    {
      icon: Image,
      label: 'Images Generated',
      count: outputs?.images?.count || 0,
      cost: outputs?.images?.cost || 0,
      color: 'text-info'
    },
    {
      icon: MessageSquare,
      label: 'LLM Calls',
      count: outputs?.llm_calls?.count || 0,
      cost: outputs?.llm_calls?.cost || 0,
      color: 'text-success'
    },
    {
      icon: Music,
      label: 'Audio Minutes',
      count: outputs?.audio?.count || 0,
      cost: outputs?.audio?.cost || 0,
      color: 'text-warning'
    }
  ];

  return (
    <Card title="Tangible Outputs">
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {outputCards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="bg-bg-surface border border-border rounded-md p-4 hover:bg-bg-hover transition-colors duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <Icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <div className="text-2xl font-code font-bold text-text-primary mb-1">
                {formatNumber(item.count)}
              </div>
              <div className="text-text-secondary text-sm mb-1">
                {item.label}
              </div>
              <div className="text-text-muted text-xs">
                {formatCost(item.cost)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default TangibleOutputs;
