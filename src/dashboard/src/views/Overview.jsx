import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../contexts/ToastContext';
import StatCard from '../components/stats/StatCard';
import SpendChart from '../components/stats/SpendChart';
import ProviderBreakdown from '../components/stats/ProviderBreakdown';
import TangibleOutputs from '../components/stats/TangibleOutputs';
import BudgetProgress from '../components/stats/BudgetProgress';
import ActivityFeed from '../components/activity/ActivityFeed';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { getStats, getDailySpend, getProviderBreakdown, getTangibleOutputs, getBudgets, getTriggerEvents } from '../services/api';

function Overview() {
  const { state } = useApp();
  const { socket } = useWebSocket();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [providers, setProviders] = useState([]);
  const [outputs, setOutputs] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [anomalyExpanded, setAnomalyExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // WebSocket listener for real-time anomaly alerts
  useEffect(() => {
    if (!socket) return;

    const handleAnomalyDetected = (event) => {
      console.log('[WebSocket] Anomaly detected:', event);
      setAnomalies(prev => [event, ...prev]);
      showToast(`Anomaly detected: ${event.trigger_type}`, 'warning');
    };

    socket.on('anomaly_detected', handleAnomalyDetected);

    return () => {
      socket.off('anomaly_detected', handleAnomalyDetected);
    };
  }, [socket, showToast]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, dailyRes, providersRes, outputsRes, budgetsRes, eventsRes] = await Promise.all([
        getStats(),
        getDailySpend(30),
        getProviderBreakdown(),
        getTangibleOutputs(),
        getBudgets(),
        getTriggerEvents()
      ]);

      setStats(statsRes);
      setDailyData(dailyRes.daily || []);
      setProviders(providersRes.providers || []);
      setOutputs(outputsRes);
      setBudgets(budgetsRes.budgets || []);

      // Filter events from last 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentAnomalies = (eventsRes.events || []).filter(event => {
        const eventTime = new Date(event.detected_at).getTime();
        return eventTime > oneDayAgo;
      });
      setAnomalies(recentAnomalies);
    } catch (err) {
      console.error('Failed to load overview data:', err);
      setError('Failed to load dashboard data. Is the ToastyKey server running?');
    } finally {
      setLoading(false);
    }
  };

  const globalBudget = budgets.find(b => b.scope === 'global');

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Overview</h1>
        </div>
        <div className="p-4 bg-bg-surface border border-error rounded-md text-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Overview</h1>
        <p className="text-text-secondary">
          Real-time API cost monitoring and analytics
        </p>
      </div>

      {/* Anomaly Alert Banner */}
      {anomalies.length > 0 && (
        <div className="bg-gradient-to-r from-error/20 to-warning/20 border border-error/50 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-text-primary font-semibold">
                    {anomalies.length} {anomalies.length === 1 ? 'anomaly' : 'anomalies'} detected in the last 24 hours
                  </h3>
                  <button
                    onClick={() => navigate('/triggers')}
                    className="text-sm text-warning hover:text-warning/80 underline"
                  >
                    View All
                  </button>
                </div>
                {anomalyExpanded && (
                  <div className="mt-3 space-y-2">
                    {anomalies.slice(0, 5).map((event, idx) => (
                      <div key={idx} className="bg-bg-base/50 rounded p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="error">{event.trigger_type}</Badge>
                          <span className="text-text-secondary text-xs">
                            {new Date(event.detected_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-text-primary">{event.message}</p>
                        {event.scope_id && (
                          <p className="text-text-muted text-xs mt-1">
                            {event.scope}: {event.scope_id}
                          </p>
                        )}
                      </div>
                    ))}
                    {anomalies.length > 5 && (
                      <p className="text-text-muted text-xs text-center pt-2">
                        and {anomalies.length - 5} more...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setAnomalyExpanded(!anomalyExpanded)}
              className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors flex-shrink-0 ml-2"
              aria-label={anomalyExpanded ? 'Collapse' : 'Expand'}
            >
              {anomalyExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          value={stats?.today?.total_inr || 0}
          label="Today's Spend"
          delta={stats?.today?.delta_vs_yesterday}
          loading={loading}
          type="currency"
          tooltip="Total cost of all API calls made today. Delta shows percentage change compared to yesterday."
        />
        <StatCard
          value={stats?.month?.total_inr || 0}
          label="This Month"
          loading={loading}
          type="currency"
          tooltip="Total cost of all API calls made this calendar month."
        />
        <StatCard
          value={stats?.today?.call_count || 0}
          label="API Calls"
          loading={loading}
          type="number"
          tooltip="Total number of API requests made today across all providers."
        />
        <StatCard
          value={stats?.active_projects || 0}
          label="Active Projects"
          loading={loading}
          type="number"
          tooltip="Number of projects that have made API calls in the last 7 days."
        />
      </div>

      {/* Budget Progress */}
      {globalBudget && (
        <BudgetProgress
          current={globalBudget.current_spend || 0}
          limit={globalBudget.limit_amount || globalBudget.limit || 0}
          label={`${globalBudget.period.charAt(0).toUpperCase() + globalBudget.period.slice(1)} Budget`}
          currency={globalBudget.currency}
          budgetId={globalBudget.id}
        />
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendChart data={dailyData} loading={loading} />
        <ProviderBreakdown data={providers} loading={loading} />
      </div>

      {/* Tangible Outputs */}
      <TangibleOutputs outputs={outputs} loading={loading} />

      {/* Activity Feed */}
      <Card title="Recent Activity">
        <div className="p-6">
          <ActivityFeed limit={20} />
        </div>
      </Card>
    </div>
  );
}

export default Overview;
