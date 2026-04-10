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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for project_detected events
  useEffect(() => {
    if (!socket) return;

    const handleProjectDetected = (project) => {
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
      <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-accent-green/30 border-t-accent-green animate-spin mx-auto mb-4" />
          <p className="text-[13px] text-white/30">Loading ToastyKey...</p>
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
        <Route path="/" element={<Layout onSearchOpen={() => setShowCommandPalette(true)}><Overview /></Layout>} />
        <Route path="/projects" element={<Layout onSearchOpen={() => setShowCommandPalette(true)}><Projects /></Layout>} />
        <Route path="/projects/:id" element={<Layout onSearchOpen={() => setShowCommandPalette(true)}><ProjectDetail /></Layout>} />
        <Route path="/vault" element={<Layout onSearchOpen={() => setShowCommandPalette(true)}><KeyVault /></Layout>} />
        <Route path="/triggers" element={<Layout onSearchOpen={() => setShowCommandPalette(true)}><Triggers /></Layout>} />
        <Route path="/reports" element={<Layout onSearchOpen={() => setShowCommandPalette(true)}><Reports /></Layout>} />
        <Route path="/settings" element={<Layout onSearchOpen={() => setShowCommandPalette(true)}><Settings /></Layout>} />
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
