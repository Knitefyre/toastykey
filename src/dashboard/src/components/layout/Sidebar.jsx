import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Key,
  Zap,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const STORAGE_KEY = 'toastykey-sidebar-collapsed';

const navigationLinks = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/vault', label: 'Key Vault', icon: Key },
  { path: '/triggers', label: 'Triggers', icon: Zap },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : false;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync with external collapsed prop (from keyboard shortcut)
  useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Toggle collapse state
  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  // Check if path is active
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Handle navigation with mobile close
  const handleNavigate = (path) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-bg-surface border-r border-border z-50
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-text-primary">
                ToastyKey
              </h1>
            )}
            <button
              onClick={toggleCollapse}
              className="p-2 rounded-md hover:bg-bg-hover text-text-secondary transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {navigationLinks.map(({ path, label, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <li key={path}>
                    <Link
                      to={path}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md
                        transition-colors duration-200
                        ${
                          active
                            ? 'bg-bg-hover text-text-primary font-medium'
                            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                        }
                      `}
                      title={isCollapsed ? label : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="truncate">{label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer (optional) */}
          {!isCollapsed && (
            <div className="p-4 border-t border-border">
              <p className="text-xs text-text-muted text-center">
                v0.2.0
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 rounded-md bg-bg-surface border border-border text-text-primary md:hidden"
        aria-label="Open sidebar"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </>
  );
}
