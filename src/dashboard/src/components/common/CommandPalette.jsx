import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, FolderKanban, Key, Zap, FileText, Settings, ArrowRight,
} from 'lucide-react';
import { getProjects, getKeys } from '../../services/api';

const VIEWS = [
  { name: 'Overview',   path: '/',         Icon: LayoutDashboard },
  { name: 'Projects',   path: '/projects', Icon: FolderKanban    },
  { name: 'Key Vault',  path: '/vault',    Icon: Key             },
  { name: 'Triggers',   path: '/triggers', Icon: Zap             },
  { name: 'Reports',    path: '/reports',  Icon: FileText        },
  { name: 'Settings',   path: '/settings', Icon: Settings        },
];

const GROUP_LABELS = { view: 'Pages', project: 'Projects', key: 'Keys' };

function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery]         = useState('');
  const [projects, setProjects]   = useState([]);
  const [keys, setKeys]           = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      loadData();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [pRes, kRes] = await Promise.all([getProjects(), getKeys()]);
      setProjects(pRes.projects || []);
      setKeys(kRes.keys || []);
    } catch {}
  };

  const filteredItems = React.useMemo(() => {
    const q = query.toLowerCase();
    const items = [];

    VIEWS.forEach(({ name, path, Icon }) => {
      if (name.toLowerCase().includes(q)) {
        items.push({
          type: 'view', id: path, title: name, subtitle: 'Navigate', Icon,
          action: () => { navigate(path); onClose(); },
        });
      }
    });

    projects.forEach(proj => {
      if (proj.name.toLowerCase().includes(q)) {
        items.push({
          type: 'project', id: `p-${proj.id}`, title: proj.name, subtitle: proj.path, Icon: FolderKanban,
          action: () => { navigate(`/projects/${proj.id}`); onClose(); },
        });
      }
    });

    keys.forEach(key => {
      if ((key.provider + key.label).toLowerCase().includes(q)) {
        items.push({
          type: 'key', id: `k-${key.id}`, title: `${key.provider} — ${key.label}`, subtitle: 'API Key', Icon: Key,
          action: () => { navigate('/vault'); onClose(); },
        });
      }
    });

    return items;
  }, [query, projects, keys, navigate, onClose]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, filteredItems.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); filteredItems[selectedIndex]?.action(); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  if (!isOpen) return null;

  // Group items by type
  const grouped = filteredItems.reduce((acc, item, idx) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push({ ...item, globalIdx: idx });
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-28 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white/[0.04] border border-white/[0.1] backdrop-blur-xl rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] w-full max-w-xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
          <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-[14px] text-white/90 placeholder-white/25 focus:outline-none"
            placeholder="Search pages, projects, keys..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="flex-shrink-0 px-1.5 py-0.5 text-[10px] text-white/25 bg-white/[0.05] border border-white/[0.08] rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-white/25">
              No results for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <div className="px-4 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
                      {GROUP_LABELS[type] ?? type}
                    </span>
                  </div>
                  {items.map(({ id, title, subtitle, Icon, action, globalIdx }) => {
                    const active = globalIdx === selectedIndex;
                    return (
                      <button
                        key={id}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 ${
                          active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                        }`}
                        onClick={action}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          active ? 'bg-accent-green/15' : 'bg-white/[0.05]'
                        }`}>
                          <Icon className={`w-3.5 h-3.5 ${active ? 'text-accent-green' : 'text-white/40'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-white/80 font-medium truncate">{title}</div>
                          <div className="text-[11px] text-white/30 truncate">{subtitle}</div>
                        </div>
                        {active && <ArrowRight className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center gap-4">
          {[
            { keys: ['↑', '↓'], label: 'Navigate' },
            { keys: ['↵'], label: 'Select'   },
            { keys: ['ESC'], label: 'Close'  },
          ].map(({ keys: ks, label }) => (
            <span key={label} className="flex items-center gap-1 text-[11px] text-white/20">
              {ks.map(k => (
                <kbd key={k} className="px-1.5 py-0.5 bg-white/[0.05] border border-white/[0.08] rounded font-mono text-[10px]">{k}</kbd>
              ))}
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
