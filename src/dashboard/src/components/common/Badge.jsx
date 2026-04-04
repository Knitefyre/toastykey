import React from 'react';

const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md';

  const variants = {
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    error: 'bg-error/10 text-error border border-error/20',
    info: 'bg-info/10 text-info border border-info/20',
    default: 'bg-bg-hover text-text-secondary border border-border',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <span className={combinedClassName}>
      {children}
    </span>
  );
};

export default Badge;
