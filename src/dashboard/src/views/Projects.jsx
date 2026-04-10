import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, ArrowRight } from 'lucide-react';
import Badge from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import { getProjects } from '../services/api';
import { formatINR, formatRelativeTime } from '../services/formatters';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProjects();
      setProjects(result.projects || []);
    } catch {
      setError('Failed to load projects. Is the ToastyKey server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-semibold text-white/90 tracking-tight mb-1">Projects</h1>
        <p className="text-[13px] text-white/35">Auto-detected from your API calls</p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-accent-red/[0.08] border border-accent-red/20 rounded-xl text-accent-red text-[13px]">
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
              <Skeleton className="h-5 w-32 mb-3 rounded-lg" />
              <Skeleton className="h-3 w-full mb-2 rounded" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.05] flex items-center justify-center mb-4">
            <FolderKanban className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-[14px] font-medium text-white/50 mb-1">No projects yet</p>
          <p className="text-[12px] text-white/25">Projects appear automatically from your API calls</p>
        </div>
      )}

      {/* Project grid */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="
                text-left w-full
                bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5
                hover:bg-white/[0.05] hover:border-white/[0.1]
                transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
                active:scale-[0.98] group
              "
            >
              {/* Title row */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-[14px] font-semibold text-white/85 leading-snug pr-2">{project.name}</h3>
                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0 mt-0.5" />
              </div>

              {/* Stats */}
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-[12px]">
                  <span className="text-white/35">Total cost</span>
                  <span className="font-mono text-white/70 tabular-nums">{formatINR(project.total_cost_inr || project.total_cost || 0, { compact: true })}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-white/35">This month</span>
                  <span className="font-mono text-white/70 tabular-nums">{formatINR(project.cost_this_month || 0, { compact: true })}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-white/35">Last active</span>
                  <span className="text-white/50">{project.last_active ? formatRelativeTime(project.last_active) : 'Never'}</span>
                </div>
              </div>

              {/* Badge */}
              <Badge variant="info" size="sm" dot>
                {project.call_count} calls
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projects;
