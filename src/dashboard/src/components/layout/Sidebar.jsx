import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Key,
  Zap,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const STORAGE_KEY = 'toastykey-sidebar-collapsed';

const navLinks = [
  { path: '/',          label: 'Overview',  icon: LayoutDashboard },
  { path: '/projects',  label: 'Projects',  icon: FolderKanban    },
  { path: '/vault',     label: 'Key Vault', icon: Key             },
  { path: '/triggers',  label: 'Triggers',  icon: Zap             },
  { path: '/reports',   label: 'Reports',   icon: FileText        },
  { path: '/settings',  label: 'Settings',  icon: Settings        },
];

export default function Sidebar({ onToggle } = {}) {
  const location = useLocation();
  const { isConnected } = useApp();

  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? false; }
    catch { return false; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-50 flex flex-col
        bg-[#09090B] border-r border-white/[0.06]
        transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Brand */}
      <div className={`
        flex items-center border-b border-white/[0.06]
        ${collapsed ? 'justify-center px-0 py-5' : 'justify-between px-5 py-5'}
      `}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-5 h-5 text-accent-green flex-shrink-0" />
            <span className="text-[15px] font-semibold text-white/90 tracking-tight truncate">
              ToastyKey
            </span>
          </div>
        )}
        <button
          onClick={() => { setCollapsed(p => !p); onToggle?.(); }}
          className={`
            w-7 h-7 flex items-center justify-center rounded-lg
            text-white/30 hover:text-white/70 hover:bg-white/[0.05]
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/60
            ${collapsed ? 'mx-auto' : ''}
          `}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft  className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {navLinks.map(({ path, label, icon: Icon }) => {
            const active = isActive(path);
            return (
              <li key={path}>
                <Link
                  to={path}
                  title={collapsed ? label : undefined}
                  className={`
                    flex items-center gap-3 rounded-xl py-2 px-2.5
                    transition-all duration-150 group
                    ${collapsed ? 'justify-center' : ''}
                    ${active
                      ? 'bg-white/[0.06] text-white/90'
                      : 'text-white/40 hover:text-white/75 hover:bg-white/[0.04]'
                    }
                  `}
                >
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${active ? 'text-accent-green' : ''}`} />
                  {!collapsed && (
                    <span className="text-[13px] font-medium truncate">{label}</span>
                  )}
                  {/* Active indicator */}
                  {active && !collapsed && (
                    <span className="ml-auto w-1 h-1 rounded-full bg-accent-green flex-shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — connection status */}
      <div className={`
        border-t border-white/[0.06] py-4
        ${collapsed ? 'px-0 flex justify-center' : 'px-4'}
      `}>
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="relative flex-shrink-0">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-green' : 'bg-accent-red'}`} />
            {isConnected && (
              <div className="absolute inset-0 rounded-full bg-accent-green animate-ping opacity-75" />
            )}
          </div>
          {!collapsed && (
            <span className="text-[11px] text-white/30">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
