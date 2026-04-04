import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import Badge from '../common/Badge';
import { formatINR, formatUSD, formatRelativeTime } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';

function ActivityItem({ call }) {
  const { state } = useApp();
  const currency = state.currency;

  const StatusIcon = call.status === 'success' ? CheckCircle : XCircle;
  const statusColor = call.status === 'success' ? 'text-success' : 'text-error';

  const formatCost = (costInr, costUsd) => {
    return currency === 'INR' ? formatINR(costInr) : formatUSD(costUsd);
  };

  const providerVariant = call.provider === 'openai' ? 'success' : call.provider === 'anthropic' ? 'warning' : 'default';

  return (
    <div className="flex items-center gap-4 p-4 bg-bg-surface border border-border rounded-md hover:bg-bg-hover transition-colors duration-200 animate-slide-in">
      {/* Status Icon */}
      <StatusIcon className={`w-5 h-5 ${statusColor} flex-shrink-0`} />

      {/* Provider Badge */}
      <Badge variant={providerVariant} size="sm">
        {call.provider}
      </Badge>

      {/* Model and Endpoint */}
      <div className="flex-1 min-w-0">
        <div className="text-text-primary font-medium truncate">
          {call.model || call.endpoint}
        </div>
        {call.project && (
          <div className="text-text-muted text-xs truncate">
            {call.project}
          </div>
        )}
      </div>

      {/* Cost */}
      <div className="text-text-primary font-code font-medium text-sm flex-shrink-0">
        {formatCost(call.cost_inr, call.cost_usd)}
      </div>

      {/* Latency */}
      {call.latency_ms && (
        <div className="text-text-secondary text-xs flex-shrink-0">
          {call.latency_ms}ms
        </div>
      )}

      {/* Timestamp */}
      <div className="text-text-secondary text-sm flex-shrink-0">
        {formatRelativeTime(call.timestamp)}
      </div>
    </div>
  );
}

export default ActivityItem;
