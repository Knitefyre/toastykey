import { Search } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function Header({ title, onSearchOpen }) {
  const { state, setCurrency } = useApp();

  const toggleCurrency = () => {
    setCurrency(state.currency === 'INR' ? 'USD' : 'INR');
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/[0.06] flex-shrink-0">
      {/* Page title */}
      {title && (
        <h1 className="text-[15px] font-semibold text-white/80 tracking-tight">
          {title}
        </h1>
      )}

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search / Command palette trigger */}
        {onSearchOpen && (
          <button
            onClick={onSearchOpen}
            className="flex items-center gap-2 h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-150 text-[12px]"
            aria-label="Open command palette"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline ml-1 text-[10px] bg-white/[0.06] border border-white/[0.08] rounded px-1 py-0.5">⌘K</kbd>
          </button>
        )}

        {/* Currency toggle */}
        <div className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-lg p-0.5">
          {['INR', 'USD'].map(cur => (
            <button
              key={cur}
              onClick={() => state.currency !== cur && toggleCurrency()}
              className={`
                px-3 py-1 rounded-md text-[12px] font-medium transition-all duration-150
                ${state.currency === cur
                  ? 'bg-white/[0.08] text-white/90'
                  : 'text-white/30 hover:text-white/60'
                }
              `}
              aria-label={`Switch to ${cur}`}
            >
              {cur}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
