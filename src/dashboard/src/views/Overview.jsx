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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
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
    } catch (error) {
      console.error('Failed to load overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const globalBudget = budgets.find(b => b.scope === 'global');

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
          value={stats?.total_spend_today || 0}
          label="Today's Spend"
          delta={stats?.delta_vs_yesterday}
          loading={loading}
          type="currency"
        />
        <StatCard
          value={stats?.total_spend_month || 0}
          label="This Month"
          loading={loading}
          type="currency"
        />
        <StatCard
          value={stats?.total_calls || 0}
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
