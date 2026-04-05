const Handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class ReportGenerator {
  constructor(db) {
    this.db = db;
    this.templates = {};
  }

  async initialize() {
    // Load Handlebars templates
    const templatePath = path.join(__dirname, 'templates');
    this.templates.main = await fs.readFile(
      path.join(templatePath, 'report.hbs'),
      'utf-8'
    );

    // Register partials
    const partials = ['header', 'summary', 'breakdown', 'trends', 'anomalies', 'recommendations'];
    for (const partial of partials) {
      const content = await fs.readFile(
        path.join(templatePath, 'partials', `${partial}.hbs`),
        'utf-8'
      );
      Handlebars.registerPartial(partial, content);
    }

    // Register helpers
    this.registerHelpers();
  }

  registerHelpers() {
    Handlebars.registerHelper('formatCurrency', (value, currency) => {
      if (currency === 'INR') {
        return `₹${value.toLocaleString('en-IN')}`;
      }
      return `$${value.toFixed(2)}`;
    });

    Handlebars.registerHelper('formatPercent', (value) => {
      return `${value.toFixed(1)}%`;
    });

    Handlebars.registerHelper('trendIcon', (change) => {
      return change > 0 ? '↑' : change < 0 ? '↓' : '→';
    });
  }

  async generateReport(type, startDate, endDate) {
    // 1. Collect data
    const data = await this.collectData(startDate, endDate);

    // 2. Calculate trends
    const trends = await this.calculateTrends(type, startDate, endDate);

    // 3. Get anomalies
    const anomalies = await this.getAnomalies(startDate, endDate);

    // 4. Generate recommendations
    const recommendations = await this.generateRecommendations(data);

    // 5. Build report object
    const report = {
      type,
      period: this.formatPeriod(type, startDate, endDate),
      generated_at: new Date().toISOString(),
      summary: data.summary,
      providers: data.providers,
      projects: data.projects,
      top_calls: data.topCalls,
      trends,
      anomalies,
      recommendations,
      budget_status: data.budgetStatus
    };

    // 6. Generate HTML
    const template = Handlebars.compile(this.templates.main);
    const html = template(report);

    // 7. Generate JSON
    const json = JSON.stringify(report, null, 2);

    return { html, json, report };
  }

  async collectData(startDate, endDate) {
    // Summary
    const summary = await this.db.get(`
      SELECT
        SUM(cost_usd) as total_usd,
        SUM(cost_inr) as total_inr,
        COUNT(*) as total_calls,
        COUNT(DISTINCT provider) as provider_count,
        COUNT(DISTINCT project) as project_count
      FROM api_calls
      WHERE timestamp BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Provider breakdown
    const providers = await this.db.all(`
      SELECT
        provider,
        SUM(cost_usd) as cost,
        COUNT(*) as calls,
        ROUND(SUM(cost_usd) * 100.0 / (SELECT SUM(cost_usd) FROM api_calls WHERE timestamp BETWEEN ? AND ?), 2) as percentage
      FROM api_calls
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY provider
      ORDER BY cost DESC
    `, [startDate, endDate, startDate, endDate]);

    // Project breakdown
    const projects = await this.db.all(`
      SELECT
        project,
        SUM(cost_usd) as cost,
        COUNT(*) as calls
      FROM api_calls
      WHERE timestamp BETWEEN ? AND ?
      AND project IS NOT NULL
      GROUP BY project
      ORDER BY cost DESC
    `, [startDate, endDate]);

    // Top 5 expensive calls
    const topCalls = await this.db.all(`
      SELECT
        provider,
        model,
        cost_usd,
        (input_tokens + output_tokens) as tokens,
        timestamp
      FROM api_calls
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY cost_usd DESC
      LIMIT 5
    `, [startDate, endDate]);

    // Budget status
    const budgetStatus = await this.getBudgetStatus();

    return {
      summary,
      providers,
      projects,
      topCalls,
      budgetStatus
    };
  }

  async getBudgetStatus() {
    const budgets = await this.db.all('SELECT * FROM budgets WHERE active = 1');
    const todaySpend = await this.db.getTotalSpend('today');

    return budgets.map(b => {
      const percentage = (todaySpend / b.limit_usd) * 100;
      return {
        period: b.period,
        limit: b.limit_usd,
        spent: todaySpend,
        percentage,
        status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok'
      };
    });
  }

  async calculateTrends(type, startDate, endDate) {
    // Calculate previous period
    const periodLength = new Date(endDate) - new Date(startDate);
    const prevEndDate = new Date(new Date(startDate) - 1);
    const prevStartDate = new Date(prevEndDate - periodLength);

    const current = await this.db.get(`
      SELECT SUM(cost_usd) as spend FROM api_calls
      WHERE timestamp BETWEEN ? AND ?
    `, [startDate, endDate]);

    const previous = await this.db.get(`
      SELECT SUM(cost_usd) as spend FROM api_calls
      WHERE timestamp BETWEEN ? AND ?
    `, [prevStartDate.toISOString(), prevEndDate.toISOString()]);

    const change = previous.spend > 0
      ? ((current.spend - previous.spend) / previous.spend) * 100
      : 0;

    return {
      current: current.spend || 0,
      previous: previous.spend || 0,
      change,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
    };
  }

  async getAnomalies(startDate, endDate) {
    const events = await this.db.all(`
      SELECT
        te.*,
        t.trigger_type,
        t.scope
      FROM trigger_events te
      JOIN triggers t ON te.trigger_id = t.id
      WHERE te.timestamp BETWEEN ? AND ?
      ORDER BY te.timestamp DESC
    `, [startDate, endDate]);

    events.forEach(e => {
      e.details = JSON.parse(e.details);
    });

    return events;
  }

  async generateRecommendations(data) {
    const recommendations = [];

    // 1. Unused keys
    const unusedKeys = await this.db.all(`
      SELECT provider, label, last_used
      FROM api_keys
      WHERE last_used IS NULL OR last_used < datetime('now', '-30 days')
    `);

    unusedKeys.forEach(key => {
      recommendations.push({
        type: 'warning',
        category: 'unused_key',
        message: `API key "${key.label}" (${key.provider}) has not been used in 30+ days. Consider removing it.`
      });
    });

    // 2. High error rate providers
    const errorRates = await this.db.all(`
      SELECT
        provider,
        COUNT(*) as total,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors,
        ROUND(SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as error_rate
      FROM api_calls
      WHERE timestamp >= datetime('now', '-7 days')
      GROUP BY provider
      HAVING error_rate > 10
    `);

    errorRates.forEach(p => {
      recommendations.push({
        type: 'warning',
        category: 'high_error_rate',
        message: `${p.provider} has ${p.error_rate}% error rate (${p.errors}/${p.total} calls). Check API key validity and request format.`
      });
    });

    // 3. Cheaper model suggestions
    const expensiveModels = await this.db.all(`
      SELECT
        provider,
        model,
        COUNT(*) as calls,
        SUM(cost_usd) as cost
      FROM api_calls
      WHERE timestamp >= datetime('now', '-7 days')
      AND provider IN ('openai', 'anthropic')
      GROUP BY provider, model
      HAVING calls > 10
    `);

    expensiveModels.forEach(m => {
      if (m.provider === 'openai' && m.model.includes('gpt-4') && !m.model.includes('mini')) {
        recommendations.push({
          type: 'suggestion',
          category: 'cheaper_model',
          message: `You're using ${m.model} (${m.calls} calls, $${m.cost.toFixed(2)}). Consider gpt-4o-mini for simpler tasks - 70% cheaper with similar quality.`
        });
      }
      if (m.provider === 'anthropic' && m.model.includes('opus')) {
        recommendations.push({
          type: 'suggestion',
          category: 'cheaper_model',
          message: `You're using ${m.model} (${m.calls} calls, $${m.cost.toFixed(2)}). Consider claude-sonnet for most tasks - significantly cheaper.`
        });
      }
    });

    return recommendations;
  }

  formatPeriod(type, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (type === 'daily') {
      return start.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else if (type === 'weekly') {
      return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (type === 'monthly') {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      return `${start.toLocaleDateString('en-US')} - ${end.toLocaleDateString('en-US')}`;
    }
  }

  async saveReport(report, html, json) {
    // Save to database
    const result = await this.db.run(`
      INSERT INTO reports (period, html_content, summary_json)
      VALUES (?, ?, ?)
    `, [report.period, html, json]);

    // Save HTML file to disk
    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const filename = `report-${report.type}-${new Date().toISOString().split('T')[0]}.html`;
    const filepath = path.join(reportsDir, filename);
    await fs.writeFile(filepath, html, 'utf-8');

    return {
      report_id: result.lastID,
      html_path: filepath
    };
  }
}

module.exports = ReportGenerator;
