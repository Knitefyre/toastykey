import React, { useState, useEffect } from 'react';
import { Radio } from 'lucide-react';
import ActivityItem from './ActivityItem';
import Button from '../common/Button';
import Skeleton from '../common/Skeleton';
import { getRecentCalls } from '../../services/api';

function ActivityFeed({ limit = 20 }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadInitialCalls();
  }, []);

  const loadInitialCalls = async () => {
    setLoading(true);
    try {
      const result = await getRecentCalls(limit, 0);
      if (result.calls) {
        setCalls(result.calls);
        setHasMore(result.calls.length === limit);
        setOffset(limit);
      }
    } catch (error) {
      console.error('Failed to load activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const result = await getRecentCalls(limit, offset);
      if (result.calls) {
        setCalls([...calls, ...result.calls]);
        setHasMore(result.calls.length === limit);
        setOffset(offset + limit);
      }
    } catch (error) {
      console.error('Failed to load more calls:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} variant="card" className="h-20" />
        ))}
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Radio className="w-12 h-12 text-text-muted mb-4" />
        <div className="text-text-primary font-medium mb-2">No API calls yet</div>
        <div className="text-text-secondary text-sm">
          Start using your API keys through the ToastyKey proxy
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {calls.map((call) => (
          <ActivityItem key={call.id} call={call} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            onClick={loadMore}
            loading={loadingMore}
            disabled={loadingMore}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
