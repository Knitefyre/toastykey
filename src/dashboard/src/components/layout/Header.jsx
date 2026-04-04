import { useApp } from '../../contexts/AppContext';

export default function Header({ title }) {
  const { isConnected, state, setCurrency } = useApp();

  const toggleCurrency = () => {
    setCurrency(state.currency === 'INR' ? 'USD' : 'INR');
  };

  return (
    <header className="bg-bg-surface border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <div className="flex items-center gap-4">
          {title && (
            <h2 className="text-xl font-semibold text-text-primary">
              {title}
            </h2>
          )}
        </div>

        {/* Right side: Status & Currency */}
        <div className="flex items-center gap-6">
          {/* WebSocket Connection Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-success' : 'bg-error'
              }`}
              aria-label={isConnected ? 'Connected' : 'Disconnected'}
            />
            <span className="text-sm text-text-secondary">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Currency Toggle */}
          <button
            onClick={toggleCurrency}
            className="px-3 py-1 rounded-md bg-bg-hover text-text-primary text-sm font-medium hover:bg-bg-primary transition-colors border border-border"
            aria-label={`Switch to ${state.currency === 'INR' ? 'USD' : 'INR'}`}
          >
            {state.currency}
          </button>
        </div>
      </div>
    </header>
  );
}
