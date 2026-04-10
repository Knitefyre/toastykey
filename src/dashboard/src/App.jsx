import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { useWebSocket } from './hooks/useWebSocket';
import Layout from './components/layout/Layout';
import Toast from './components/common/Toast';
import CommandPalette from './components/common/CommandPalette';
import ErrorBoundary from './components/common/ErrorBoundary';
import SetupWizard from './components/wizard/SetupWizard';
import Overview from './views/Overview';
import Projects from './views/Projects';
import ProjectDetail from './views/ProjectDetail';
import KeyVault from './views/KeyVault';
import Triggers from './views/Triggers';
import Reports from './views/Reports';
import Settings from './views/Settings';
import { getSetupStatus } from './services/api';

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function AppContent() {
  const [needsSetup, setNeedsSetup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { socket } = useWebSocket();
  const { showToast } = useToast();

  useEffect(() => {
    checkSetupStatus();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K / Ctrl+K - Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      // Cmd+B / Ctrl+B - Toggle Sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for project_detected events
  useEffect(() => {
    if (!socket) return;

    const handleProjectDetected = (project) => {
      console.log('[Dashboard] New project detected:', project);
      showToast(
        `New project detected: ${project.name} (${project.type})`,
        'info'
      );
    };

    socket.on('project_detected', handleProjectDetected);

    return () => {
      socket.off('project_detected', handleProjectDetected);
    };
  }, [socket, showToast]);

  const checkSetupStatus = async () => {
    try {
      const result = await getSetupStatus();
      setNeedsSetup(result.needs_setup === true);
    } catch (error) {
      console.error('Failed to check setup status:', error);
      setNeedsSetup(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setNeedsSetup(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <h1 className="text-4xl font-code font-bold text-success mb-4">
            🔥 ToastyKey
          </h1>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div key="setup-wizard">
        <SetupWizard onComplete={handleSetupComplete} />
      </div>
    );
  }

  return (
    <div key="dashboard">
      <Routes>
        <Route path="/" element={<Layout collapsed={sidebarCollapsed}><Overview /></Layout>} />
        <Route path="/projects" element={<Layout collapsed={sidebarCollapsed}><Projects /></Layout>} />
        <Route path="/projects/:id" element={<Layout collapsed={sidebarCollapsed}><ProjectDetail /></Layout>} />
        <Route path="/vault" element={<Layout collapsed={sidebarCollapsed}><KeyVault /></Layout>} />
        <Route path="/triggers" element={<Layout collapsed={sidebarCollapsed}><Triggers /></Layout>} />
        <Route path="/reports" element={<Layout collapsed={sidebarCollapsed}><Reports /></Layout>} />
        <Route path="/settings" element={<Layout collapsed={sidebarCollapsed}><Settings /></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
