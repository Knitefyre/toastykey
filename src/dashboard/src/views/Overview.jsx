import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import StatCard from '../components/stats/StatCard';
import SpendChart from '../components/stats/SpendChart';
import ProviderBreakdown from '../components/stats/ProviderBreakdown';
import TangibleOutputs from '../components/stats/TangibleOutputs';
import BudgetProgress from '../components/stats/BudgetProgress';
import ActivityFeed from '../components/activity/ActivityFeed';
import Card from '../components/common/Card';
import { getStats, getDailySpend, getProviderBreakdown, getTangibleOutputs, getBudgets } from '../services/api';

function Overview() {
  const { state } = useApp();
  const [stats, setStats] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [providers, setProviders] = useState([]);
  const [outputs, setOutputs] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, dailyRes, providersRes, outputsRes, budgetsRes] = await Promise.all([
        getStats(),
        getDailySpend(30),
        getProviderBreakdown(),
        getTangibleOutputs(),
        getBudgets()
      ]);

      setStats(statsRes);
      setDailyData(dailyRes.daily || []);
      setProviders(providersRes.providers || []);
      setOutputs(outputsRes);
      setBudgets(budgetsRes.budgets || []);
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          value={stats?.today?.total_inr || 0}
          label="Today's Spend"
          delta={stats?.today?.delta_vs_yesterday}
          loading={loading}
          type="currency"
        />
        <StatCard
          value={stats?.month?.total_inr || 0}
          label="This Month"
          loading={loading}
          type="currency"
        />
        <StatCard
          value={stats?.today?.call_count || 0}
          label="API Calls"
          loading={loading}
          type="number"
        />
        <StatCard
          value={stats?.active_projects || 0}
          label="Active Projects"
          loading={loading}
          type="number"
        />
      </div>

      {/* Budget Progress */}
      {globalBudget && (
        <BudgetProgress
          current={globalBudget.current_spend || 0}
          limit={globalBudget.limit}
          label={`${globalBudget.period} Budget`}
          currency={globalBudget.currency}
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
