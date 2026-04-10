import React, { useState, useEffect } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Tooltip from '../components/common/Tooltip';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

function Settings() {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const [currency, setCurrency] = useState(state.currency || 'INR');
  const [autoScan, setAutoScan] = useState(true);
  const [autoReports, setAutoReports] = useState(false);
  const [reportSchedule, setReportSchedule] = useState('weekly');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedCurrency = localStorage.getItem('toastykey_currency');
    if (savedCurrency) {
      setCurrency(savedCurrency);
      dispatch({ type: 'SET_CURRENCY', payload: savedCurrency });
    }

    const savedAutoScan = localStorage.getItem('toastykey_auto_scan');
    if (savedAutoScan !== null) {
      setAutoScan(savedAutoScan === 'true');
    }

    const savedAutoReports = localStorage.getItem('toastykey_auto_reports');
    if (savedAutoReports !== null) {
      setAutoReports(savedAutoReports === 'true');
    }

    const savedReportSchedule = localStorage.getItem('toastykey_report_schedule');
    if (savedReportSchedule) {
      setReportSchedule(savedReportSchedule);
    }
  }, [dispatch]);

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem('toastykey_currency', newCurrency);
    dispatch({ type: 'SET_CURRENCY', payload: newCurrency });
    showToast(`Currency changed to ${newCurrency}`, 'success');
  };

  const handleAutoScanChange = (enabled) => {
    setAutoScan(enabled);
    localStorage.setItem('toastykey_auto_scan', enabled.toString());
    showToast(`Auto-scan ${enabled ? 'enabled' : 'disabled'}`, 'success');
  };

  const handleAutoReportsChange = (enabled) => {
    setAutoReports(enabled);
    localStorage.setItem('toastykey_auto_reports', enabled.toString());
    showToast(`Auto-reports ${enabled ? 'enabled' : 'disabled'}`, 'success');
  };

  const handleReportScheduleChange = (schedule) => {
    setReportSchedule(schedule);
    localStorage.setItem('toastykey_report_schedule', schedule);
    showToast(`Report schedule: ${schedule}`, 'success');
  };

  const mcpConfig = {
    "mcpServers": {
      "toastykey": {
        "command": "node",
        "args": ["/path/to/toastykey/src/index.js", "mcp"]
      }
    }
  };

  const handleCopyMcpConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
    setCopied(true);
    showToast('MCP config copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <Tooltip content="Configure ToastyKey preferences and integrations" />
        </div>
        <p className="text-text-secondary">
          Customize your ToastyKey experience
        </p>
      </div>

      {/* Preferences */}
      <Card title="Preferences">
        <div className="p-6 space-y-6">
          {/* Currency */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-text-primary font-medium">Currency</label>
                <Tooltip content="Choose your preferred currency for displaying costs throughout the dashboard" />
              </div>
              <p className="text-text-muted text-sm">Display costs in INR or USD</p>
            </div>
            <div className="flex bg-bg-base border border-border rounded-lg p-1">
              <button
                onClick={() => handleCurrencyChange('INR')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  currency === 'INR'
                    ? 'bg-success text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                INR
              </button>
              <button
                onClick={() => handleCurrencyChange('USD')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  currency === 'USD'
                    ? 'bg-success text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                USD
              </button>
            </div>
          </div>

          {/* Auto-scan */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-text-primary font-medium">Auto-scan on startup</label>
                <Tooltip content="Automatically scan for new .env files when ToastyKey starts" />
              </div>
              <p className="text-text-muted text-sm">Check for new API keys on startup</p>
            </div>
            <button
              onClick={() => handleAutoScanChange(!autoScan)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoScan ? 'bg-success' : 'bg-bg-hover'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoScan ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Auto-reports */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-text-primary font-medium">Auto-generate reports</label>
                <Tooltip content="Automatically generate usage reports on a schedule" />
              </div>
              <p className="text-text-muted text-sm">Generate reports automatically</p>
            </div>
            <button
              onClick={() => handleAutoReportsChange(!autoReports)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoReports ? 'bg-success' : 'bg-bg-hover'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoReports ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Report Schedule */}
          {autoReports && (
            <div className="flex items-center justify-between">
              <div>
                <label className="text-text-primary font-medium">Report schedule</label>
                <p className="text-text-muted text-sm">How often to generate reports</p>
              </div>
              <select
                value={reportSchedule}
                onChange={(e) => handleReportScheduleChange(e.target.value)}
                className="px-3 py-2 bg-bg-base border border-border rounded-md text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-success"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* MCP Integration */}
      <Card title="MCP Integration">
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-text-primary font-medium">Claude Code Configuration</h3>
              <Tooltip content="Add this configuration to your Claude Code settings to enable ToastyKey MCP integration" />
            </div>
            <p className="text-text-muted text-sm">
              Add this to your Claude Code <code className="text-text-primary">settings.json</code>
            </p>
          </div>

          <div className="relative">
            <pre className="bg-bg-base border border-border rounded-lg p-4 text-sm text-text-primary font-mono overflow-x-auto">
              {JSON.stringify(mcpConfig, null, 2)}
            </pre>
            <Button
              variant="secondary"
              size="small"
              onClick={handleCopyMcpConfig}
              className="absolute top-2 right-2"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card title="About">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🔥</div>
            <div>
              <h3 className="text-text-primary font-bold text-lg">ToastyKey</h3>
              <p className="text-text-muted text-sm">Version 1.0.0</p>
            </div>
          </div>

          <p className="text-text-secondary">
            The API cost layer for AI-native builders. Track, control, and understand your AI API spending.
          </p>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Knitefyre/toastykey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-success hover:text-success/80 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-medium">View on GitHub</span>
            </a>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-text-muted text-sm">
              Built by <span className="text-text-primary font-medium">Toasty Media</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Settings;
