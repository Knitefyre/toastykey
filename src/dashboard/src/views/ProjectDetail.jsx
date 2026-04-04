import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ActivityFeed from '../components/activity/ActivityFeed';
import ProviderBreakdown from '../components/stats/ProviderBreakdown';
import Skeleton from '../components/common/Skeleton';
import { getProject } from '../services/api';
import { formatINR } from '../services/formatters';

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    setLoading(true);
    try {
      const result = await getProject(id);
      setProject(result.project);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Button variant="secondary" onClick={() => navigate('/projects')} className="mb-6">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
        <Skeleton variant="card" className="h-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <Button variant="secondary" onClick={() => navigate('/projects')} className="mb-6">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
        <div className="text-text-primary">Project not found</div>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <Button variant="secondary" onClick={() => navigate('/projects')} className="mb-6">
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back to Projects
      </Button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">{project.name}</h1>
        <p className="text-text-secondary">{project.directory_path}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="p-6">
            <div className="text-3xl font-code font-bold text-text-primary mb-1">
              {formatINR(project.total_cost_inr, { compact: true })}
            </div>
            <div className="text-text-secondary text-sm">Total Cost</div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div className="text-3xl font-code font-bold text-text-primary mb-1">
              {project.call_count}
            </div>
            <div className="text-text-secondary text-sm">API Calls</div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div className="text-3xl font-code font-bold text-text-primary mb-1">
              {project.sessions?.length || 0}
            </div>
            <div className="text-text-secondary text-sm">Sessions</div>
          </div>
        </Card>
      </div>

      {/* Provider Breakdown */}
      {project.providers && project.providers.length > 0 && (
        <div className="mb-6">
          <ProviderBreakdown data={project.providers} loading={false} />
        </div>
      )}

      {/* Recent Activity */}
      <Card title="Recent Activity">
        <div className="p-6">
          <ActivityFeed limit={10} />
        </div>
      </Card>
    </div>
  );
}

export default ProjectDetail;
