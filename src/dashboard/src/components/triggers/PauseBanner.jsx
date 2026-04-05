import React from 'react';
import { PauseCircle } from 'lucide-react';
import Button from '../common/Button';
import { formatRelativeTime } from '../../services/formatters';

function PauseBanner({ paused, onResume }) {
  if (!paused || paused.length === 0) return null;

  return (
    <div className="bg-warning/10 border border-warning rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <PauseCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-warning font-medium text-sm mb-2">
            {paused.length} entity{paused.length > 1 ? 'ies' : ''} currently paused
          </p>
          <div className="space-y-2">
            {paused.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-bg-surface rounded-md px-3 py-2">
                <div>
                  <span className="text-text-primary text-sm font-medium">{p.entity_id}</span>
                  <span className="text-text-muted text-xs ml-2">({p.entity_type})</span>
                  <p className="text-text-secondary text-xs mt-0.5">
                    Paused {formatRelativeTime(p.paused_at)} \u2014 {p.reason || 'Anomaly detected'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => onResume(p.entity_type, p.entity_id)}
                  className="text-xs py-1 px-3"
                >
                  Resume
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PauseBanner;
