import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronUp, DollarSign, BarChart2, Activity, Layers } from 'lucide-react';
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

  const [stats, setStats]               = useState(null);
  const [dailyData, setDailyData]       = useState([]);
  const [providers, setProviders]       = useState([]);
  const [outputs, setOutputs]           = useState(null);
  const [budgets, setBudgets]           = useState([]);
  const [anomalies, setAnomalies]       = useState([]);
  const [anomalyExpanded, setAnomalyExpanded] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!socket) return;
    const onAnomaly = (event) => {
      setAnomalies(prev => [event, ...prev]);
      showToast(`Anomaly detected: ${event.trigger_type}`, 'warning');
    };
    socket.on('anomaly_detected', onAnomaly);
    return () => socket.off('anomaly_detected', onAnomaly);
  }, [socket, showToast]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, dailyRes, providersRes, outputsRes, budgetsRes, eventsRes] = await Promise.all([
        getStats(), getDailySpend(30), getProviderBreakdown(),
        getTangibleOutputs(), getBudgets(), getTriggerEvents(),
      ]);
      setStats(statsRes);
      setDailyData(dailyRes.daily || []);
      setProviders(providersRes.providers || []);
      setOutputs(outputsRes);
      setBudgets(budgetsRes.budgets || []);

      const oneDayAgo = Date.now() - 86400000;
      setAnomalies((eventsRes.events || []).filter(e => new Date(e.detected_at).getTime() > oneDayAgo));
    } catch (err) {
      setError('Failed to load dashboard data. Is the ToastyKey server running?');
    } finally {
      setLoading(false);
    }
  };

  const globalBudget = budgets.find(b => b.scope === 'global');

  if (error) {
    return (
      <div className="space-y-6 page-enter">
        <PageHeader />
        <div className="flex items-center gap-3 p-4 bg-accent-red/[0.08] border border-accent-red/20 rounded-xl text-accent-red text-[13px]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <PageHeader />

      {/* Anomaly Banner */}
      {anomalies.length > 0 && (
        <div className="bg-accent-red/[0.06] border border-accent-red/20 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <span className="text-[13px] font-medium text-white/80">
                    {anomalies.length} {anomalies.length === 1 ? 'anomaly' : 'anomalies'} in the last 24h
                  </span>
                  <button
                    onClick={() => navigate('/triggers')}
                    className="text-[12px] text-accent-amber hover:text-accent-amber/70 transition-colors"
                  >
                    View all →
                  </button>
                </div>
                {anomalyExpanded && (
                  <div className="mt-3 space-y-2">
                    {anomalies.slice(0, 5).map((event, i) => (
                      <div key={i} className="bg-black/20 rounded-xl p-3 text-[12px]">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="error" size="sm">{event.trigger_type}</Badge>
                          <span className="text-white/30">{new Date(event.detected_at).toLocaleString()}</span>
                        </div>
                        <p className="text-white/70">{event.message}</p>
                      </div>
                    ))}
                    {anomalies.length > 5 && (
                      <p className="text-center text-[11px] text-white/25 pt-1">
                        +{anomalies.length - 5} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setAnomalyExpanded(p => !p)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all duration-150 flex-shrink-0"
            >
              {anomalyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard value={stats?.today?.total_inr || 0}    label="Today's Spend"    delta={stats?.today?.delta_vs_yesterday} loading={loading} type="currency" icon={DollarSign} tooltip="Total API cost today. Delta vs yesterday." />
        <StatCard value={stats?.month?.total_inr || 0}    label="This Month"       loading={loading} type="currency" icon={BarChart2}  tooltip="Total API cost this calendar month." />
        <StatCard value={stats?.today?.call_count || 0}   label="API Calls Today"  loading={loading} type="number"   icon={Activity}   tooltip="Total API requests made today." />
        <StatCard value={stats?.active_projects || 0}     label="Active Projects"  loading={loading} type="number"   icon={Layers}     tooltip="Projects with API calls in the last 7 days." />
      </div>

      {/* Budget */}
      {globalBudget && (
        <BudgetProgress
          current={globalBudget.current_spend || 0}
          limit={globalBudget.limit_amount || globalBudget.limit || 0}
          label={`${(globalBudget.period || 'month').charAt(0).toUpperCase() + (globalBudget.period || 'month').slice(1)} Budget`}
          currency={globalBudget.currency}
          budgetId={globalBudget.id}
        />
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendChart data={dailyData} loading={loading} />
        <ProviderBreakdown data={providers} loading={loading} />
      </div>

      {/* Tangible Outputs */}
      <TangibleOutputs outputs={outputs} loading={loading} />

      {/* Activity */}
      <Card title="Recent Activity" noPadding>
        <div className="p-6">
          <ActivityFeed limit={20} />
        </div>
      </Card>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-[20px] font-semibold text-white/90 tracking-tight mb-1">Overview</h1>
      <p className="text-[13px] text-white/35">Real-time API cost monitoring and analytics</p>
    </div>
  );
}

export default Overview;
