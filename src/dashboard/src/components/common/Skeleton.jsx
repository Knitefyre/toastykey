import React from 'react';

const Skeleton = ({ className = '', width, height }) => {
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`skeleton ${className}`}
      style={style}
      aria-busy="true"
      aria-live="polite"
    />
  );
};

// Convenience presets
Skeleton.Text  = ({ lines = 1, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className="h-3 rounded"
        style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
      />
    ))}
  </div>
);

Skeleton.Card = ({ className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 ${className}`}>
    <Skeleton className="h-8 w-28 mb-3 rounded-lg" />
    <Skeleton className="h-3 w-40 rounded" />
  </div>
);

Skeleton.Row = ({ className = '' }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-32 rounded" />
      <Skeleton className="h-2.5 w-20 rounded" />
    </div>
    <Skeleton className="h-3 w-16 rounded" />
  </div>
);

export default Skeleton;
