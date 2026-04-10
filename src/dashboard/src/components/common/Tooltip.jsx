import React, { useState } from 'react';
import { Info } from 'lucide-react';

export default function Tooltip({ content, className = '' }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className={`text-text-tertiary hover:text-text-secondary transition-colors ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => e.preventDefault()}
      >
        <Info size={14} />
      </button>
      {isVisible && (
        <div className="absolute z-50 w-64 p-3 text-sm bg-bg-tertiary border border-border rounded-lg shadow-lg bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <div className="text-text-primary">{content}</div>
          <div className="absolute w-2 h-2 bg-bg-tertiary border-r border-b border-border transform rotate-45 -bottom-1 left-1/2 -translate-x-1/2"></div>
        </div>
      )}
    </div>
  );
}
