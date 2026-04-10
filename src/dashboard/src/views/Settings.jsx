import React, { useState, useEffect } from 'react';
import { Copy, ExternalLink, Check, Flame } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Tooltip from '../components/common/Tooltip';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

/* Reusable toggle */
function Toggle({ enabled, onToggle, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      disabled={disabled}
      className={`
        relative w-9 h-5 rounded-full transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/60
        ${enabled ? 'bg-accent-green' : 'bg-white/[0.12]'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm
          transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${enabled ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

/* Section row */
function SettingRow({ label, description, tooltip, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/[0.05] last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[13px] font-medium text-white/80">{label}</span>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        {description && <p className="text-[12px] text-white/30">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Settings() {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();

  const [currency, setCurrency]           = useState(state.currency || 'INR');
  const [autoScan, setAutoScan]           = useState(true);
  const [autoReports, setAutoReports]     = useState(false);
  const [reportSchedule, setReportSchedule] = useState('weekly');
  const [copied, setCopied]               = useState(false);

  useEffect(() => {
    const saved = (key, fallback) => {
      const v = localStorage.getItem(key);
      return v !== null ? v : fallback;
    };
    const cur = saved('toastykey_currency', 'INR');
    setCurrency(cur);
    dispatch({ type: 'SET_CURRENCY', payload: cur });
    setAutoScan(saved('toastykey_auto_scan', 'true') === 'true');
    setAutoReports(saved('toastykey_auto_reports', 'false') === 'true');
    setReportSchedule(saved('toastykey_report_schedule', 'weekly'));
  }, [dispatch]);

  const handleCurrency = (cur) => {
    setCurrency(cur);
    localStorage.setItem('toastykey_currency', cur);
    dispatch({ type: 'SET_CURRENCY', payload: cur });
    showToast(`Currency: ${cur}`, 'success');
  };

  const handleAutoScan = (val) => {
    setAutoScan(val);
    localStorage.setItem('toastykey_auto_scan', val);
    showToast(`Auto-scan ${val ? 'enabled' : 'disabled'}`, 'success');
  };

  const handleAutoReports = (val) => {
    setAutoReports(val);
    localStorage.setItem('toastykey_auto_reports', val);
    showToast(`Auto-reports ${val ? 'enabled' : 'disabled'}`, 'success');
  };

  const handleReportSchedule = (schedule) => {
    setReportSchedule(schedule);
    localStorage.setItem('toastykey_report_schedule', schedule);
    showToast(`Report schedule: ${schedule}`, 'success');
  };

  const mcpConfig = {
    mcpServers: {
      toastykey: {
        command: 'node',
        args: ['/path/to/toastykey/src/index.js', 'mcp'],
      },
    },
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
    setCopied(true);
    showToast('MCP config copied', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 page-enter max-w-2xl">
      {/* Page header */}
      <div>
        <h1 className="text-[20px] font-semibold text-white/90 tracking-tight mb-1">Settings</h1>
        <p className="text-[13px] text-white/35">Customize your ToastyKey experience</p>
      </div>

      {/* Preferences */}
      <Card title="Preferences">
        {/* Currency */}
        <SettingRow
          label="Currency"
          description="Display costs in INR or USD"
          tooltip="Choose your preferred currency for all cost displays"
        >
          <div className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-xl p-0.5">
            {['INR', 'USD'].map(cur => (
              <button
                key={cur}
                onClick={() => handleCurrency(cur)}
                className={`
                  px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150
                  ${currency === cur
                    ? 'bg-accent-green/90 text-[#09090B] font-semibold'
                    : 'text-white/40 hover:text-white/70'
                  }
                `}
              >
                {cur}
              </button>
            ))}
          </div>
        </SettingRow>

        {/* Auto-scan */}
        <SettingRow
          label="Auto-scan on startup"
          description="Check for new API keys when ToastyKey starts"
          tooltip="Automatically scan for new .env files on startup"
        >
          <Toggle enabled={autoScan} onToggle={() => handleAutoScan(!autoScan)} />
        </SettingRow>

        {/* Auto-reports */}
        <SettingRow
          label="Auto-generate reports"
          description="Generate usage reports on a schedule"
          tooltip="Automatically create cost reports at regular intervals"
        >
          <Toggle enabled={autoReports} onToggle={() => handleAutoReports(!autoReports)} />
        </SettingRow>

        {/* Report schedule — only shown when auto-reports on */}
        {autoReports && (
          <SettingRow label="Report schedule" description="How often to generate reports">
            <select
              value={reportSchedule}
              onChange={e => handleReportSchedule(e.target.value)}
              className="input-base w-auto text-[12px] py-1.5"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </SettingRow>
        )}
      </Card>

      {/* MCP Integration */}
      <Card title="MCP Integration">
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[13px] font-medium text-white/70">Claude Code Configuration</span>
            <Tooltip content="Add this to your Claude Code settings.json to enable ToastyKey MCP integration" />
          </div>
          <p className="text-[12px] text-white/30">
            Add this to your <code className="text-white/50 font-mono text-[11px]">settings.json</code>, then replace the path with your actual ToastyKey install location.
          </p>
        </div>

        <div className="relative">
          <pre className="bg-black/30 border border-white/[0.06] rounded-xl p-4 text-[12px] text-white/60 font-mono overflow-x-auto leading-relaxed">
            {JSON.stringify(mcpConfig, null, 2)}
          </pre>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="absolute top-3 right-3"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </Card>

      {/* About */}
      <Card title="About">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-accent-green" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-white/85">ToastyKey</h3>
            <p className="text-[12px] text-white/30">Version 1.0.0 · Local-first API cost layer</p>
          </div>
        </div>

        <p className="text-[13px] text-white/40 mb-4 leading-relaxed">
          Track, control, and understand your AI API spending. Built for AI-native builders who want full cost visibility without sacrificing privacy.
        </p>

        <div className="flex items-center gap-4 pt-4 border-t border-white/[0.05]">
          <a
            href="https://github.com/Knitefyre/toastykey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-accent-green hover:text-accent-green/70 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View on GitHub
          </a>
          <span className="text-[12px] text-white/20">·</span>
          <span className="text-[12px] text-white/25">Built by Toasty Media</span>
        </div>
      </Card>
    </div>
  );
}

export default Settings;
