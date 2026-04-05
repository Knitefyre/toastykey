import React, { useEffect, useState } from 'react';
import { Plus, FileText, Calendar, Download, Trash2, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Skeleton from '../components/common/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { getReports, generateReport, getReport, deleteReport } from '../services/api';
import { formatINR, formatUSD, formatPercent } from '../services/formatters';
import { useApp } from '../contexts/AppContext';

function Reports() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const { showToast } = useToast();
  const { state } = useApp();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReports();
      setReports(res.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load reports. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (type, startDate, endDate) => {
    setGenerating(true);
    try {
      await generateReport(type, startDate, endDate);
      showToast('Report generated successfully', 'success');
      setShowGenerateModal(false);
      loadReports();
    } catch (err) {
      showToast(err.message || 'Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleView = async (reportId) => {
    try {
      const res = await getReport(reportId);
      setSelectedReport(res.report);
      setShowDetailModal(true);
    } catch (err) {
      showToast('Failed to load report details', 'error');
    }
  };

  const handleDelete = async (reportId) => {
    if (!confirm('Delete this report?')) return;
    try {
      await deleteReport(reportId);
      showToast('Report deleted', 'success');
      loadReports();
    } catch (err) {
      showToast('Failed to delete report', 'error');
    }
  };

  const formatCurrency = (value) => {
    return state.currency === 'INR' ? formatINR(value) : formatUSD(value);
  };

  const getReportTypeBadge = (period) => {
    if (!period) return <Badge>custom</Badge>;
    if (period.includes('daily')) return <Badge variant="info">daily</Badge>;
    if (period.includes('weekly') || period.includes('Week')) return <Badge variant="warning">weekly</Badge>;
    if (period.includes('monthly') || period.includes('Month')) return <Badge variant="success">monthly</Badge>;
    return <Badge>custom</Badge>;
  };

  const getRelativeTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Usage Reports</h1>
          <p className="text-text-secondary">Generate comprehensive cost reports and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadReports}
            className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button variant="primary" onClick={() => setShowGenerateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-bg-surface border border-error rounded-md text-error mb-4">{error}</div>
      )}

      {/* Reports List */}
      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : reports.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-text-primary mb-2">No reports yet</h2>
              <p className="text-text-secondary mb-6">Generate your first report to see spending insights</p>
              <Button variant="primary" onClick={() => setShowGenerateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </Card>
        ) : (
          reports.map(report => {
            const summary = report.summary_json ? JSON.parse(report.summary_json) : null;
            return (
              <Card key={report.id}>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getReportTypeBadge(report.period)}
                        <h3 className="text-text-primary font-semibold">{report.period}</h3>
                      </div>
                      <p className="text-text-secondary text-sm mb-3">
                        Generated {getRelativeTime(report.created_at)}
                      </p>
                      {summary?.summary && (
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-text-muted">
                            Total: <span className="text-text-primary font-medium">
                              {formatCurrency(summary.summary.total_usd)}
                            </span>
                          </span>
                          <span className="text-text-muted">
                            Calls: <span className="text-text-primary font-medium">
                              {summary.summary.total_calls}
                            </span>
                          </span>
                          <span className="text-text-muted">
                            Providers: <span className="text-text-primary font-medium">
                              {summary.summary.provider_count}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleView(report.id)}>
                        View
                      </Button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-2 rounded-md text-text-secondary hover:text-error hover:bg-bg-hover transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Generate Modal */}
      <GenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        generating={generating}
      />

      {/* Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedReport(null);
          }}
          report={selectedReport}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}

function GenerateModal({ isOpen, onClose, onGenerate, generating }) {
  const [type, setType] = useState('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    let start, end;
    const now = new Date();

    if (type === 'daily') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      start = yesterday.toISOString();
      end = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000).toISOString();
    } else if (type === 'weekly') {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);
      start = lastWeek.toISOString();
      end = new Date(lastWeek.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (type === 'monthly') {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);
      start = lastMonth.toISOString();
      const nextMonth = new Date(lastMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      end = nextMonth.toISOString();
    } else {
      // custom
      start = new Date(startDate).toISOString();
      end = new Date(endDate).toISOString();
    }

    onGenerate(type, start, end);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Report">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-text-primary text-sm font-medium mb-2">Report Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 bg-bg-surface border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-success"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {type === 'custom' && (
          <>
            <div>
              <label className="block text-text-primary text-sm font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-bg-surface border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-success"
                required
              />
            </div>
            <div>
              <label className="block text-text-primary text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-bg-surface border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-success"
                required
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={generating}>
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReportDetailModal({ isOpen, onClose, report, formatCurrency }) {
  const summary = typeof report.summary_json === 'string'
    ? JSON.parse(report.summary_json)
    : report.summary_json;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={report.period} size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
        {/* Summary Stats */}
        {summary?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-surface border border-border rounded-md p-4">
              <div className="text-text-muted text-xs mb-1">Total Spend</div>
              <div className="text-text-primary text-xl font-bold">
                {formatCurrency(summary.summary.total_usd)}
              </div>
            </div>
            <div className="bg-bg-surface border border-border rounded-md p-4">
              <div className="text-text-muted text-xs mb-1">API Calls</div>
              <div className="text-text-primary text-xl font-bold">
                {summary.summary.total_calls}
              </div>
            </div>
            <div className="bg-bg-surface border border-border rounded-md p-4">
              <div className="text-text-muted text-xs mb-1">Providers</div>
              <div className="text-text-primary text-xl font-bold">
                {summary.summary.provider_count}
              </div>
            </div>
            <div className="bg-bg-surface border border-border rounded-md p-4">
              <div className="text-text-muted text-xs mb-1">Projects</div>
              <div className="text-text-primary text-xl font-bold">
                {summary.summary.project_count}
              </div>
            </div>
          </div>
        )}

        {/* Trend */}
        {summary?.trends && (
          <div className="bg-bg-surface border border-border rounded-md p-4">
            <h3 className="text-text-primary font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trend Comparison
            </h3>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-text-muted">
                Previous Period: <span className="text-text-primary font-medium">
                  {formatCurrency(summary.trends.previous)}
                </span>
              </span>
              <span className={`font-medium ${summary.trends.change >= 0 ? 'text-error' : 'text-success'}`}>
                {summary.trends.change >= 0 ? '↑' : '↓'} {Math.abs(summary.trends.change).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Provider Breakdown */}
        {summary?.providers && summary.providers.length > 0 && (
          <div className="bg-bg-surface border border-border rounded-md p-4">
            <h3 className="text-text-primary font-semibold mb-3">Provider Breakdown</h3>
            <div className="space-y-2">
              {summary.providers.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary capitalize">{p.provider}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">{p.calls} calls</span>
                    <span className="text-text-primary font-medium">{formatCurrency(p.cost)}</span>
                    <Badge variant="default">{p.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Expensive Calls */}
        {summary?.top_calls && summary.top_calls.length > 0 && (
          <div className="bg-bg-surface border border-border rounded-md p-4">
            <h3 className="text-text-primary font-semibold mb-3">Top 5 Expensive Calls</h3>
            <div className="space-y-2">
              {summary.top_calls.map((call, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-text-primary capitalize font-medium">{call.provider}</span>
                    <span className="text-text-muted mx-2">•</span>
                    <span className="text-text-secondary text-xs">{call.model}</span>
                  </div>
                  <span className="text-text-primary font-medium">{formatCurrency(call.cost_usd)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anomalies */}
        {summary?.anomalies && summary.anomalies.length > 0 && (
          <div className="bg-bg-surface border border-error/50 rounded-md p-4">
            <h3 className="text-text-primary font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-error" />
              Anomaly Events ({summary.anomalies.length})
            </h3>
            <div className="space-y-2">
              {summary.anomalies.slice(0, 5).map((event, i) => (
                <div key={i} className="text-sm">
                  <Badge variant="error">{event.trigger_type.replace('_', ' ')}</Badge>
                  <span className="text-text-muted ml-2">
                    {event.entity_type}/{event.entity_id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {summary?.recommendations && summary.recommendations.length > 0 && (
          <div className="bg-bg-surface border border-warning/50 rounded-md p-4">
            <h3 className="text-text-primary font-semibold mb-3">Recommendations</h3>
            <div className="space-y-3">
              {summary.recommendations.map((rec, i) => (
                <div key={i} className={`text-sm p-3 rounded-md ${
                  rec.type === 'warning' ? 'bg-warning/10 border border-warning/30' : 'bg-info/10 border border-info/30'
                }`}>
                  <Badge variant={rec.type === 'warning' ? 'warning' : 'info'} size="sm">
                    {rec.category.replace('_', ' ')}
                  </Badge>
                  <p className="text-text-secondary mt-2">{rec.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default Reports;
