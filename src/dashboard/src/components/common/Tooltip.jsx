import React, { useState } from 'react';
import { Info } from 'lucide-react';

export default function Tooltip({ content, className = '' }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        className={`w-4 h-4 flex items-center justify-center text-white/25 hover:text-white/50 transition-colors duration-150 ${className}`}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={(e) => e.preventDefault()}
        aria-label="More information"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {visible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 pointer-events-none animate-fade-in">
          <div className="bg-[#1a1a1f] border border-white/[0.1] rounded-xl px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <p className="text-[12px] text-white/70 leading-relaxed">{content}</p>
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5">
            <div className="w-2.5 h-2.5 bg-[#1a1a1f] border-r border-b border-white/[0.1] rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
