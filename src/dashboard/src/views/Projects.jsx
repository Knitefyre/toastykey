import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import { getProjects } from '../services/api';
import { formatINR, formatRelativeTime } from '../services/formatters';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const result = await getProjects();
      setProjects(result.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Projects</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="card" className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Projects</h1>
        <div className="flex flex-col items-center justify-center py-12 bg-bg-surface border border-border rounded-md">
          <FolderKanban className="w-12 h-12 text-text-muted mb-4" />
          <div className="text-text-primary font-medium mb-2">No projects yet</div>
          <div className="text-text-secondary text-sm">
            Projects are automatically detected from your API calls
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Projects</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer hover:border-success transition-colors"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-text-primary">{project.name}</h3>
                <Badge variant="info" size="sm">
                  {project.call_count} calls
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Cost:</span>
                  <span className="text-text-primary font-code">
                    {formatINR(project.total_cost_inr, { compact: true })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">This Month:</span>
                  <span className="text-text-primary font-code">
                    {formatINR(project.cost_this_month || 0, { compact: true })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Last Active:</span>
                  <span className="text-text-primary">
                    {project.last_active ? formatRelativeTime(project.last_active) : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default Projects;
