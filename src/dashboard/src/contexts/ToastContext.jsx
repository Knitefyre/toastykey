import { createContext, useContext, useState, useCallback } from 'react';

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Auto-dismiss duration in milliseconds
const TOAST_DURATION = 3000;

// Create context
const ToastContext = createContext(null);

// ToastProvider component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Generate unique ID for toasts
  const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Remove toast by ID
  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  // Show toast notification
  const showToast = useCallback(
    (message, type = TOAST_TYPES.INFO) => {
      const id = generateId();

      // Create new toast
      const newToast = {
        id,
        message,
        type,
      };

      // Add toast to state
      setToasts((prevToasts) => [...prevToasts, newToast]);

      // Auto-dismiss after TOAST_DURATION
      setTimeout(() => {
        removeToast(id);
      }, TOAST_DURATION);

      return id;
    },
    [removeToast]
  );

  // Context value
  const value = {
    toasts,
    showToast,
    removeToast,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

// Custom hook to use ToastContext
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
