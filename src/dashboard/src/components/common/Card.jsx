import React from 'react';
import Tooltip from './Tooltip';

const Card = ({ children, title, tooltip, className = '' }) => {
  return (
    <div
      className={`bg-bg-surface border border-border rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-black/20 hover:translate-y-[-2px] ${className}`}
    >
      {title && (
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            {tooltip && <Tooltip content={tooltip} />}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default Card;
