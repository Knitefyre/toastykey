import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import ActivityItem from './ActivityItem';
import Button from '../common/Button';
import Skeleton from '../common/Skeleton';
import { getRecentCalls } from '../../services/api';

function ActivityFeed({ limit = 20 }) {
  const [calls, setCalls]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset]         = useState(0);
  const [hasMore, setHasMore]       = useState(true);

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const result = await getRecentCalls(limit, 0);
      setCalls(result.calls || []);
      setHasMore((result.calls || []).length === limit);
      setOffset(limit);
    } catch {}
    finally { setLoading(false); }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const result = await getRecentCalls(limit, offset);
      const more = result.calls || [];
      setCalls(prev => [...prev, ...more]);
      setHasMore(more.length === limit);
      setOffset(prev => prev + limit);
    } catch {}
    finally { setLoadingMore(false); }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton.Row key={i} className="py-2" />)}
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
          <Activity className="w-5 h-5 text-white/20" />
        </div>
        <p className="text-[13px] text-white/40 font-medium mb-1">No API calls yet</p>
        <p className="text-[12px] text-white/20">Start using your keys through the ToastyKey proxy</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-1.5">
        {calls.map(call => <ActivityItem key={call.id} call={call} />)}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" size="sm" onClick={loadMore} loading={loadingMore} disabled={loadingMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
