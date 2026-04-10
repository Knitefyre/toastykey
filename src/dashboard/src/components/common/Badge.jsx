import React from 'react';

const Badge = ({ children, variant = 'default', size = 'md', dot = false, className = '' }) => {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-full';

  const variants = {
    default:  'bg-white/[0.06] text-white/50 border border-white/[0.08]',
    success:  'bg-accent-green/10 text-accent-green border border-accent-green/20',
    warning:  'bg-accent-amber/10 text-accent-amber border border-accent-amber/20',
    error:    'bg-accent-red/10 text-accent-red border border-accent-red/20',
    info:     'bg-accent-blue/10 text-accent-blue border border-accent-blue/20',
    purple:   'bg-accent-purple/10 text-accent-purple border border-accent-purple/20',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] tracking-wide',
    md: 'px-2.5 py-1 text-[11px] tracking-wide',
  };

  const dotColors = {
    default: 'bg-white/30',
    success: 'bg-accent-green',
    warning: 'bg-accent-amber',
    error:   'bg-accent-red',
    info:    'bg-accent-blue',
    purple:  'bg-accent-purple',
  };

  return (
    <span className={`${base} ${variants[variant] ?? variants.default} ${sizes[size] ?? sizes.md} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant] ?? dotColors.default}`} />
      )}
      {children}
    </span>
  );
};

export default Badge;
