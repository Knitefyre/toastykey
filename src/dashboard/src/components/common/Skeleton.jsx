import React from 'react';

const Skeleton = ({ variant = 'text', className = '' }) => {
  const baseStyles = 'bg-bg-hover animate-pulse';

  const variants = {
    text: 'h-4 rounded w-full',
    card: 'h-48 rounded-lg w-full',
    circle: 'h-12 w-12 rounded-full',
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${className}`;

  return <div className={combinedClassName} aria-busy="true" aria-live="polite" />;
};

export default Skeleton;
