import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const STORAGE_KEY = 'toastykey-sidebar-collapsed';

export default function Layout({ children, pageTitle, onSearchOpen }) {
  // Mirror the sidebar's collapsed state so the main content can shift correctly
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? false; }
    catch { return false; }
  });

  // Listen for sidebar toggle via storage events (same-tab via custom event)
  useEffect(() => {
    const onStorage = () => {
      try {
        setSidebarCollapsed(JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? false);
      } catch {}
    };
    window.addEventListener('toastykey-sidebar-toggle', onStorage);
    return () => window.removeEventListener('toastykey-sidebar-toggle', onStorage);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#09090B]">
      <Sidebar onToggle={() => {
        const next = !sidebarCollapsed;
        setSidebarCollapsed(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event('toastykey-sidebar-toggle'));
      }} />

      {/* Main content — shift based on sidebar width */}
      <div
        className={`
          flex-1 flex flex-col min-w-0
          transition-[margin-left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${sidebarCollapsed ? 'ml-16' : 'ml-60'}
        `}
      >
        <Header title={pageTitle} onSearchOpen={onSearchOpen} />

        <main className="flex-1 overflow-auto p-6 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
