import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import Badge from '../common/Badge';
import Skeleton from '../common/Skeleton';
import { getTriggerEvents } from '../../services/api';
import { formatRelativeTime } from '../../services/formatters';

const TYPE_COLOR = {
  rate_spike: 'warning', cost_spike: 'error', error_storm: 'error',
  token_explosion: 'warning', silent_drain: 'info', new_provider: 'info',
};

const LIMIT = 10;

function EventLog() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);

  const loadEvents = useCallback(async (newOffset) => {
    setError(null);
    setLoading(true);
    try {
      const res = await getTriggerEvents({ limit: LIMIT, offset: newOffset });
      if (newOffset === 0) {
        setEvents(res.events || []);
      } else {
        setEvents(prev => [...prev, ...(res.events || [])]);
      }
      setTotal(res.total || 0);
      setOffset(newOffset);
    } catch (err) {
      console.error('Failed to load trigger events:', err);
      if (newOffset === 0) setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents(0);
  }, [loadEvents]);

  if (loading && events.length === 0) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;
  }

  if (error && events.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-error">
        <AlertTriangle className="w-8 h-8 mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-text-muted">
        <AlertTriangle className="w-8 h-8 mb-2" />
        <p className="text-sm">No trigger events yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {events.map(event => (
          <div key={event.id} className="bg-bg-primary border border-border rounded-md p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={TYPE_COLOR[event.trigger_type] || 'default'}>
                  {event.trigger_type?.replace(/_/g, ' ')}
                </Badge>
                <span className="text-text-secondary">{event.action_taken?.replace(/_/g, ' ')}</span>
                {event.entity_id && (
                  <span className="text-text-muted font-code text-xs">{event.entity_id}</span>
                )}
              </div>
              <span className="text-text-muted text-xs flex-shrink-0">
                {formatRelativeTime(event.timestamp)}
              </span>
            </div>
            {event.metric_value != null && event.baseline_value != null && (
              <p className="text-text-muted text-xs mt-1">
                Value: <span className="text-warning">{event.metric_value?.toFixed(2)}</span>
                {' '}vs baseline <span className="text-text-secondary">{event.baseline_value?.toFixed(2)}</span>
              </p>
            )}
          </div>
        ))}
      </div>
      {events.length < total && (
        <button
          onClick={() => loadEvents(offset + LIMIT)}
          disabled={loading}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-md hover:bg-bg-hover transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          {loading ? 'Loading\u2026' : `Load more (${total - events.length} remaining)`}
        </button>
      )}
    </div>
  );
}

export default EventLog;
