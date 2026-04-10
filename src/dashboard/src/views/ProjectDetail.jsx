import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, DollarSign, Phone, Layers } from 'lucide-react';
import Button from '../components/common/Button';
import ActivityFeed from '../components/activity/ActivityFeed';
import ProviderBreakdown from '../components/stats/ProviderBreakdown';
import Skeleton from '../components/common/Skeleton';
import Card from '../components/common/Card';
import { getProject } from '../services/api';
import { formatINR } from '../services/formatters';

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => { loadProject(); }, [id]);

  const loadProject = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getProject(id));
    } catch {
      setError('Failed to load project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const BackButton = () => (
    <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="mb-6">
      <ChevronLeft className="w-4 h-4" />
      Back to Projects
    </Button>
  );

  if (loading) {
    return (
      <div className="page-enter">
        <BackButton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-enter">
        <BackButton />
        <div className="flex items-center gap-3 p-4 bg-accent-red/[0.08] border border-accent-red/20 rounded-xl text-accent-red text-[13px]">
          {error}
        </div>
      </div>
    );
  }

  if (!data?.project) {
    return (
      <div className="page-enter">
        <BackButton />
        <p className="text-[13px] text-white/40">Project not found.</p>
      </div>
    );
  }

  const { project, sessions, cost_by_provider } = data;

  // `project.total_cost` is a denormalised column that may not be updated —
  // sum live from cost_by_provider instead.
  const totalCostINR = (cost_by_provider || []).reduce((s, p) => s + (p.cost_inr || 0), 0);

  return (
    <div className="space-y-6 page-enter">
      <BackButton />

      {/* Header */}
      <div>
        <h1 className="text-[20px] font-semibold text-white/90 tracking-tight mb-1">{project.name}</h1>
        {project.directory_path && (
          <p className="text-[12px] text-white/30 font-mono">{project.directory_path}</p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: DollarSign, value: formatINR(totalCostINR), label: 'Total Cost' },
          { icon: Phone,      value: project.call_count || 0,  label: 'API Calls' },
          { icon: Layers,     value: sessions?.length || 0,    label: 'Sessions'  },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-white/40" />
            </div>
            <div className="font-mono text-[24px] font-semibold text-white/90 tabular-nums leading-none mb-1.5">
              {value}
            </div>
            <div className="text-[12px] text-white/35">{label}</div>
          </div>
        ))}
      </div>

      {/* Provider Breakdown */}
      {cost_by_provider?.length > 0 && (
        <ProviderBreakdown data={cost_by_provider} loading={false} />
      )}

      {/* Activity */}
      <Card title="Recent Activity" noPadding>
        <div className="p-6">
          <ActivityFeed limit={10} />
        </div>
      </Card>
    </div>
  );
}

export default ProjectDetail;
