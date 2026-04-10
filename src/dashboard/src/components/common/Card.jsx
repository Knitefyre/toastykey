import React from 'react';
import Tooltip from './Tooltip';

const Card = ({ children, title, tooltip, className = '', elevated = false, noPadding = false }) => {
  const base = elevated
    ? 'bg-white/[0.05] border border-white/[0.08]'
    : 'bg-white/[0.03] border border-white/[0.06]';

  return (
    <div
      className={`
        ${base}
        rounded-2xl
        backdrop-blur-xl
        transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:bg-white/[0.05] hover:border-white/[0.1]
        ${className}
      `}
    >
      {title && (
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-white/90 tracking-tight">{title}</h3>
            {tooltip && <Tooltip content={tooltip} />}
          </div>
        </div>
      )}
      {noPadding ? children : <div className="p-6">{children}</div>}
    </div>
  );
};

export default Card;
