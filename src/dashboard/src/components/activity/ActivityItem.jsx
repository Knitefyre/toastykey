import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import Badge from '../common/Badge';
import { formatINR, formatUSD, formatRelativeTime } from '../../services/formatters';
import { useApp } from '../../contexts/AppContext';

const PROVIDER_VARIANT = {
  openai:    'success',
  anthropic: 'warning',
};

function ActivityItem({ call }) {
  const { state } = useApp();
  const currency  = state.currency;
  const success   = call.status === 'success';

  const fmt = () => currency === 'INR'
    ? formatINR(call.cost_inr)
    : formatUSD(call.cost_usd);

  return (
    <div className="
      flex items-center gap-3 px-4 py-3
      bg-white/[0.02] hover:bg-white/[0.04]
      border border-white/[0.04] hover:border-white/[0.07]
      rounded-xl transition-all duration-150
    ">
      {/* Status */}
      {success
        ? <CheckCircle className="w-4 h-4 text-accent-green flex-shrink-0" />
        : <XCircle    className="w-4 h-4 text-accent-red   flex-shrink-0" />
      }

      {/* Provider badge */}
      <Badge variant={PROVIDER_VARIANT[call.provider] ?? 'default'} size="sm">
        {call.provider}
      </Badge>

      {/* Model / endpoint */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-white/75 font-medium truncate">
          {call.model || call.endpoint}
        </div>
        {call.project && (
          <div className="text-[11px] text-white/25 truncate">{call.project}</div>
        )}
      </div>

      {/* Cost */}
      <span className="font-mono text-[13px] text-white/60 tabular-nums flex-shrink-0">
        {fmt()}
      </span>

      {/* Latency */}
      {call.latency_ms != null && (
        <span className="text-[11px] text-white/25 flex-shrink-0 hidden sm:inline">
          {call.latency_ms}ms
        </span>
      )}

      {/* Time */}
      <span className="text-[11px] text-white/25 flex-shrink-0">
        {formatRelativeTime(call.timestamp)}
      </span>
    </div>
  );
}

export default ActivityItem;
