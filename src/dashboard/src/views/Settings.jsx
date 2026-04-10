import React, { useState, useEffect, useRef } from 'react';
import { Copy, ExternalLink, Check, Flame, Trash2, Database, AlertTriangle, RefreshCw } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Tooltip from '../components/common/Tooltip';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { getDataStats, clearData, addDemoData } from '../services/api';

/* ── Reusable toggle ─────────────────────────────────────────────────────── */
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

/* ── Section row ─────────────────────────────────────────────────────────── */
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

/* ── Clear Data Modal ────────────────────────────────────────────────────── */
function ClearDataModal({ isOpen, onClose, onCleared }) {
  const [mode, setMode] = useState('preset'); // 'preset' | 'custom'
  const [preset, setPreset] = useState('7');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clearing, setClearing] = useState(false);
  const { showToast } = useToast();

  const handleClear = async () => {
    setClearing(true);
    try {
      let start, end;
      if (mode === 'preset') {
        end = new Date().toISOString();
        start = new Date(Date.now() - parseInt(preset) * 24 * 60 * 60 * 1000).toISOString();
      } else {
        if (!startDate || !endDate) { showToast('Select start and end dates', 'error'); setClearing(false); return; }
        start = new Date(startDate).toISOString();
        end   = new Date(endDate + 'T23:59:59').toISOString();
      }
      const res = await clearData(start, end);
      showToast(`Cleared ${res.deleted} call record(s)`, 'success');
      onCleared();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to clear data', 'error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Clear Data" size="sm">
      <div className="space-y-4">
        <div className="p-3 bg-accent-amber/[0.08] border border-accent-amber/20 rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-accent-amber leading-relaxed">
            This permanently deletes API call records. This action cannot be undone.
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-xl p-0.5">
          {[{ v: 'preset', l: 'Quick Range' }, { v: 'custom', l: 'Custom Dates' }].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setMode(v)}
              className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 ${
                mode === v ? 'bg-white/[0.08] text-white/85' : 'text-white/35 hover:text-white/60'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {mode === 'preset' ? (
          <div>
            <label className="block text-[12px] font-medium text-white/50 mb-2">Delete records from the past</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ v: '7', l: '7 days' }, { v: '30', l: '30 days' }, { v: '90', l: '90 days' }].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setPreset(v)}
                  className={`py-2 rounded-xl text-[12px] font-medium border transition-all duration-150 ${
                    preset === v
                      ? 'bg-accent-red/10 border-accent-red/30 text-accent-red'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/[0.1]'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-white/50 mb-1.5">From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-white/50 mb-1.5">To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-base" />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={clearing}>Cancel</Button>
          <Button
            onClick={handleClear}
            disabled={clearing}
            className="bg-accent-red/90 hover:bg-accent-red text-white rounded-xl px-4 py-2 text-[13px] font-semibold transition-all disabled:opacity-50"
          >
            {clearing ? 'Clearing…' : 'Delete Records'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Demo Data Modal ─────────────────────────────────────────────────────── */
function DemoDataModal({ isOpen, onClose, existingCount, onGenerated }) {
  const [confirmText, setConfirmText] = useState('');
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef(null);
  const { showToast } = useToast();
  const needsConfirm = existingCount > 0;
  const confirmed = !needsConfirm || confirmText === 'rewrite';

  useEffect(() => {
    if (isOpen && needsConfirm) setTimeout(() => inputRef.current?.focus(), 100);
    if (!isOpen) setConfirmText('');
  }, [isOpen, needsConfirm]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await addDemoData(needsConfirm);
      showToast(res.message || `Generated ${res.calls_generated} demo calls`, 'success');
      onGenerated();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to generate demo data', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Demo Data" size="sm">
      <div className="space-y-4">
        {/* What gets generated */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
          <p className="text-[12px] font-medium text-white/60 mb-2">Will generate ~1 week of demo data:</p>
          {[
            '~490 API calls across 7 days',
            '4 providers: OpenAI, Anthropic, ElevenLabs, Stability',
            '5 sample projects',
            '1 sample weekly report',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-accent-green flex-shrink-0" />
              <span className="text-[12px] text-white/45">{item}</span>
            </div>
          ))}
        </div>

        {/* Warning if data already exists */}
        {needsConfirm && (
          <div className="space-y-3">
            <div className="p-3 bg-accent-amber/[0.08] border border-accent-amber/20 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-accent-amber leading-relaxed">
                You already have <strong>{existingCount.toLocaleString()}</strong> call records.
                Adding demo data will mix with existing data.
                Type <code className="bg-white/10 px-1 rounded font-mono">rewrite</code> to confirm.
              </p>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder='Type "rewrite" to confirm'
              className="input-base font-mono text-[13px]"
              onKeyDown={e => { if (e.key === 'Enter' && confirmed) handleGenerate(); }}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={generating}>Cancel</Button>
          <Button variant="primary" onClick={handleGenerate} disabled={generating || !confirmed}>
            {generating ? 'Generating…' : 'Generate Demo Data'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Main Settings view ──────────────────────────────────────────────────── */
function Settings() {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();

  const [currency, setCurrency]             = useState(state.currency || 'INR');
  const [autoScan, setAutoScan]             = useState(true);
  const [autoReports, setAutoReports]       = useState(false);
  const [reportSchedule, setReportSchedule] = useState('weekly');
  const [copied, setCopied]                 = useState(false);

  // Data management
  const [showClearModal, setShowClearModal]   = useState(false);
  const [showDemoModal, setShowDemoModal]     = useState(false);
  const [dataStats, setDataStats]             = useState(null);
  const [statsLoading, setStatsLoading]       = useState(true);

  useEffect(() => {
    const saved = (key, fallback) => { const v = localStorage.getItem(key); return v !== null ? v : fallback; };
    const cur = saved('toastykey_currency', 'INR');
    setCurrency(cur);
    dispatch({ type: 'SET_CURRENCY', payload: cur });
    setAutoScan(saved('toastykey_auto_scan', 'true') === 'true');
    setAutoReports(saved('toastykey_auto_reports', 'false') === 'true');
    setReportSchedule(saved('toastykey_report_schedule', 'weekly'));
    loadDataStats();
  }, [dispatch]);

  const loadDataStats = async () => {
    setStatsLoading(true);
    try {
      const s = await getDataStats();
      setDataStats(s);
    } catch { setDataStats(null); }
    finally { setStatsLoading(false); }
  };

  const handleCurrency = (cur) => {
    setCurrency(cur);
    localStorage.setItem('toastykey_currency', cur);
    dispatch({ type: 'SET_CURRENCY', payload: cur });
    showToast(`Currency: ${cur}`, 'success');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
    setCopied(true);
    showToast('MCP config copied', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const mcpConfig = {
    mcpServers: {
      toastykey: {
        command: 'node',
        args: ['/path/to/toastykey/src/index.js', 'mcp'],
      },
    },
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 page-enter max-w-2xl">
      <div>
        <h1 className="text-[20px] font-semibold text-white/90 tracking-tight mb-1">Settings</h1>
        <p className="text-[13px] text-white/35">Customize your ToastyKey experience</p>
      </div>

      {/* Preferences */}
      <Card title="Preferences">
        <SettingRow label="Currency" description="Display costs in INR or USD" tooltip="Choose your preferred currency for all cost displays">
          <div className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-xl p-0.5">
            {['INR', 'USD'].map(cur => (
              <button
                key={cur}
                onClick={() => handleCurrency(cur)}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 ${
                  currency === cur ? 'bg-accent-green/90 text-[#09090B] font-semibold' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Auto-scan on startup" description="Check for new API keys when ToastyKey starts" tooltip="Automatically scan for new .env files on startup">
          <Toggle enabled={autoScan} onToggle={() => {
            const v = !autoScan; setAutoScan(v);
            localStorage.setItem('toastykey_auto_scan', v);
            showToast(`Auto-scan ${v ? 'enabled' : 'disabled'}`, 'success');
          }} />
        </SettingRow>

        <SettingRow label="Auto-generate reports" description="Generate usage reports on a schedule" tooltip="Automatically create cost reports at regular intervals">
          <Toggle enabled={autoReports} onToggle={() => {
            const v = !autoReports; setAutoReports(v);
            localStorage.setItem('toastykey_auto_reports', v);
            showToast(`Auto-reports ${v ? 'enabled' : 'disabled'}`, 'success');
          }} />
        </SettingRow>

        {autoReports && (
          <SettingRow label="Report schedule" description="How often to generate reports">
            <select
              value={reportSchedule}
              onChange={e => {
                setReportSchedule(e.target.value);
                localStorage.setItem('toastykey_report_schedule', e.target.value);
                showToast(`Report schedule: ${e.target.value}`, 'success');
              }}
              className="input-base w-auto text-[12px] py-1.5"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </SettingRow>
        )}
      </Card>

      {/* Data Management */}
      <Card title="Data Management">
        {/* Stats bar */}
        <div className="mb-5 p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center justify-between gap-4">
          {statsLoading ? (
            <div className="flex items-center gap-2 text-[12px] text-white/30">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Loading data stats…
            </div>
          ) : dataStats ? (
            <div className="flex items-center gap-6 text-[12px]">
              <span className="text-white/35">Records: <span className="font-mono text-white/65 tabular-nums">{(dataStats.total_calls || 0).toLocaleString()}</span></span>
              <span className="text-white/35">From: <span className="text-white/55">{formatDate(dataStats.oldest)}</span></span>
              <span className="text-white/35">To: <span className="text-white/55">{formatDate(dataStats.newest)}</span></span>
            </div>
          ) : (
            <span className="text-[12px] text-white/25">Could not load data stats</span>
          )}
          <button onClick={loadDataStats} className="text-white/25 hover:text-white/55 transition-colors flex-shrink-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Clear Data */}
          <button
            onClick={() => setShowClearModal(true)}
            className="
              flex flex-col items-start gap-2 p-4
              bg-white/[0.03] border border-white/[0.06] rounded-xl
              hover:bg-accent-red/[0.06] hover:border-accent-red/20
              transition-all duration-200 text-left group
            "
          >
            <div className="w-8 h-8 rounded-lg bg-accent-red/10 flex items-center justify-center group-hover:bg-accent-red/15 transition-colors">
              <Trash2 className="w-4 h-4 text-accent-red" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white/80 mb-0.5">Clear Data</p>
              <p className="text-[11px] text-white/30 leading-relaxed">Delete API call records for a date range</p>
            </div>
          </button>

          {/* Add Demo Data */}
          <button
            onClick={() => setShowDemoModal(true)}
            className="
              flex flex-col items-start gap-2 p-4
              bg-white/[0.03] border border-white/[0.06] rounded-xl
              hover:bg-accent-green/[0.06] hover:border-accent-green/20
              transition-all duration-200 text-left group
            "
          >
            <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center group-hover:bg-accent-green/15 transition-colors">
              <Database className="w-4 h-4 text-accent-green" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white/80 mb-0.5">Add Demo Data</p>
              <p className="text-[11px] text-white/30 leading-relaxed">Generate 1 week of realistic sample data + report</p>
            </div>
          </button>
        </div>
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
          <Button variant="secondary" size="sm" onClick={handleCopy} className="absolute top-3 right-3">
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

      {/* Modals */}
      <ClearDataModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onCleared={loadDataStats}
      />
      <DemoDataModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        existingCount={dataStats?.total_calls || 0}
        onGenerated={loadDataStats}
      />
    </div>
  );
}

export default Settings;
