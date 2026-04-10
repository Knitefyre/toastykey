import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const config = {
  success: {
    icon: CheckCircle,
    bar:  'bg-accent-green',
    text: 'text-accent-green',
    bg:   'bg-accent-green/[0.08] border-accent-green/20',
  },
  warning: {
    icon: AlertTriangle,
    bar:  'bg-accent-amber',
    text: 'text-accent-amber',
    bg:   'bg-accent-amber/[0.08] border-accent-amber/20',
  },
  error: {
    icon: XCircle,
    bar:  'bg-accent-red',
    text: 'text-accent-red',
    bg:   'bg-accent-red/[0.08] border-accent-red/20',
  },
  info: {
    icon: Info,
    bar:  'bg-accent-blue',
    text: 'text-accent-blue',
    bg:   'bg-accent-blue/[0.08] border-accent-blue/20',
  },
};

const Toast = ({ type = 'info', message, onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const { icon: Icon, bar, text, bg } = config[type] ?? config.info;

  return (
    <div
      className={`
        relative flex items-start gap-3 pl-4 pr-3 py-3
        rounded-xl border backdrop-blur-xl
        shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        animate-slide-in overflow-hidden
        ${bg}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${bar} rounded-l-xl`} />

      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${text}`} aria-hidden="true" />

      <p className="flex-1 text-[13px] text-white/80 leading-snug">{message}</p>

      <button
        onClick={onClose}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-150"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default Toast;
