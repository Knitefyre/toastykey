import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const Toast = ({ type = 'info', message, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: CheckCircle,
    warning: AlertTriangle,
    info: Info,
    error: XCircle,
  };

  const styles = {
    success: 'bg-success/10 border-success text-success',
    warning: 'bg-warning/10 border-warning text-warning',
    info: 'bg-info/10 border-info text-info',
    error: 'bg-error/10 border-error text-error',
  };

  const Icon = icons[type];

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg backdrop-blur-sm animate-slide-in ${styles[type]}`}
      role="alert"
      aria-live="polite"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1 text-sm text-text-primary">{message}</p>
      <button
        onClick={onClose}
        className="p-0.5 rounded hover:bg-bg-hover/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-border"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-text-secondary hover:text-text-primary" />
      </button>
    </div>
  );
};

export default Toast;
