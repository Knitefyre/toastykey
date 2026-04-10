import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { getProjects, getKeys } from '../../services/api';

const VIEWS = [
  { name: 'Overview', path: '/', icon: '📊' },
  { name: 'Projects', path: '/projects', icon: '📁' },
  { name: 'Key Vault', path: '/vault', icon: '🔑' },
  { name: 'Triggers', path: '/triggers', icon: '⚡' },
  { name: 'Reports', path: '/reports', icon: '📄' },
  { name: 'Settings', path: '/settings', icon: '⚙️' }
];

function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [keys, setKeys] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      loadData();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [projectsRes, keysRes] = await Promise.all([
        getProjects(),
        getKeys()
      ]);
      setProjects(projectsRes.projects || []);
      setKeys(keysRes.keys || []);
    } catch (err) {
      console.error('Failed to load command palette data:', err);
    }
  };

  const filteredItems = React.useMemo(() => {
    const q = query.toLowerCase();
    const items = [];

    // Views
    VIEWS.forEach(view => {
      if (view.name.toLowerCase().includes(q)) {
        items.push({
          type: 'view',
          id: view.path,
          title: view.name,
          subtitle: 'Navigate to page',
          icon: view.icon,
          action: () => {
            navigate(view.path);
            onClose();
          }
        });
      }
    });

    // Projects
    projects.forEach(proj => {
      if (proj.name.toLowerCase().includes(q)) {
        items.push({
          type: 'project',
          id: `project-${proj.id}`,
          title: proj.name,
          subtitle: proj.path,
          icon: '📁',
          action: () => {
            navigate(`/projects/${proj.id}`);
            onClose();
          }
        });
      }
    });

    // Keys
    keys.forEach(key => {
      if (key.provider.toLowerCase().includes(q) || key.label.toLowerCase().includes(q)) {
        items.push({
          type: 'key',
          id: `key-${key.id}`,
          title: `${key.provider} - ${key.label}`,
          subtitle: 'API Key',
          icon: '🔑',
          action: () => {
            navigate('/vault');
            onClose();
          }
        });
      }
    });

    return items;
  }, [query, projects, keys, navigate, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-32"
      onClick={onClose}
    >
      <div
        className="bg-bg-surface border border-border rounded-lg shadow-2xl w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-text-primary text-lg focus:outline-none placeholder-text-muted"
            placeholder="Search views, projects, keys..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="px-2 py-1 text-xs bg-bg-hover border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-muted">
              No results found
            </div>
          ) : (
            <div>
              {filteredItems.map((item, index) => (
                <button
                  key={item.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-bg-hover'
                      : 'hover:bg-bg-hover'
                  }`}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-text-primary font-medium truncate">
                      {item.title}
                    </div>
                    <div className="text-text-muted text-sm truncate">
                      {item.subtitle}
                    </div>
                  </div>
                  {index === selectedIndex && (
                    <ArrowRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-bg-base">
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-bg-hover border border-border rounded">↑</kbd>
              <kbd className="px-1 bg-bg-hover border border-border rounded">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-bg-hover border border-border rounded">↵</kbd>
              Select
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
