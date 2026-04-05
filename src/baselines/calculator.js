/**
 * BaselineCalculator
 * Runs hourly to calculate 7-day rolling averages for metrics
 * Calculates baselines for global, provider, and project scopes
 */

class BaselineCalculator {
  constructor(db) {
    this.db = db;
    this.intervalId = null;
    this.HOURS_IN_7_DAYS = 168;
  }

  /**
   * Start hourly calculation loop
   * Runs immediately, then every hour
   */
  async start() {
    // Run immediately
    await this.updateAll();

    // Set up hourly interval (3600000ms = 1 hour)
    this.intervalId = setInterval(async () => {
      await this.updateAll();
    }, 3600000);
  }

  /**
   * Stop the calculation loop
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Calculate all scopes and metrics with error handling
   */
  async updateAll() {
    try {
      const metrics = ['call_rate', 'cost_rate', 'error_rate', 'token_avg'];

      // Calculate global baselines
      for (const metric of metrics) {
        await this.updateMetric('global', null, metric);
      }

      // Calculate provider baselines
      const providers = await this.getActiveProviders();
      for (const provider of providers) {
        for (const metric of metrics) {
          await this.updateMetric('provider', provider, metric);
        }
      }

      // Calculate project baselines
      const projects = await this.getActiveProjects();
      for (const project of projects) {
        for (const metric of metrics) {
          await this.updateMetric('project', project, metric);
        }
      }
    } catch (error) {
      console.error('[BaselineCalculator] Error in updateAll:', error);
    }
  }

  /**
   * Update a single metric for a scope
   */
  async updateMetric(scope, scopeId, metric) {
    try {
      const value = await this.calculateMetric(scope, scopeId, metric);

      if (value !== null) {
        const sampleSize = await this.getSampleSize(scope, scopeId);
        await this.storeBaseline(scope, scopeId, metric, value, sampleSize);
      }
    } catch (error) {
      console.error(`[BaselineCalculator] Error updating ${scope}:${scopeId} ${metric}:`, error);
    }
  }

  /**
   * Calculate a single metric value
   * Returns null if insufficient data (< 10 samples)
   */
  async calculateMetric(scope, scopeId, metric) {
    // Check sample size first
    const sampleSize = await this.getSampleSize(scope, scopeId);
    if (sampleSize < 10) {
      return null;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const timestamp = sevenDaysAgo.toISOString();

    let query = '';
    let params = [timestamp];

    // Add scope filter
    if (scope === 'provider') {
      query = ' AND provider = ?';
      params.push(scopeId);
    } else if (scope === 'project') {
      query = ' AND project = ?';
      params.push(scopeId);
    }

    switch (metric) {
      case 'call_rate': {
        // COUNT(*) / hours over 7 days
        const result = await this.db.db.get(
          `SELECT COUNT(*) as count FROM api_calls WHERE timestamp >= ?${query}`,
          params
        );
        return result.count / this.HOURS_IN_7_DAYS;
      }

      case 'cost_rate': {
        // SUM(cost_usd) / hours over 7 days
        const result = await this.db.db.get(
          `SELECT SUM(cost_usd) as total FROM api_calls WHERE timestamp >= ?${query}`,
          params
        );
        const total = result.total || 0;
        return total / this.HOURS_IN_7_DAYS;
      }

      case 'error_rate': {
        // (errors / total) * 100
        const result = await this.db.db.get(
          `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors
          FROM api_calls
          WHERE timestamp >= ?${query}`,
          params
        );
        if (result.total === 0) return 0;
        return (result.errors / result.total) * 100;
      }

      case 'token_avg': {
        // AVG(tokens) if sample_size > 10
        const result = await this.db.db.get(
          `SELECT AVG(input_tokens + output_tokens) as avg_tokens
          FROM api_calls
          WHERE timestamp >= ?${query}`,
          params
        );
        return result.avg_tokens || 0;
      }

      default:
        throw new Error(`Unknown metric: ${metric}`);
    }
  }

  /**
   * Get sample size (COUNT(*) over 7 days)
   */
  async getSampleSize(scope, scopeId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const timestamp = sevenDaysAgo.toISOString();

    let query = 'SELECT COUNT(*) as count FROM api_calls WHERE timestamp >= ?';
    const params = [timestamp];

    if (scope === 'provider') {
      query += ' AND provider = ?';
      params.push(scopeId);
    } else if (scope === 'project') {
      query += ' AND project = ?';
      params.push(scopeId);
    }

    const result = await this.db.db.get(query, params);
    return result.count;
  }

  /**
   * Store baseline in database
   */
  async storeBaseline(scope, scopeId, metric, value, sampleSize) {
    const today = new Date().toISOString().split('T')[0];

    await this.db.createBaseline({
      date: today,
      scope,
      scope_id: scopeId,
      metric,
      value,
      sample_size: sampleSize
    });
  }

  /**
   * Get list of active providers from api_calls
   */
  async getActiveProviders() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const timestamp = sevenDaysAgo.toISOString();

    const results = await this.db.db.all(
      `SELECT DISTINCT provider FROM api_calls WHERE timestamp >= ?`,
      [timestamp]
    );

    return results.map(r => r.provider);
  }

  /**
   * Get list of active projects from api_calls
   */
  async getActiveProjects() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const timestamp = sevenDaysAgo.toISOString();

    const results = await this.db.db.all(
      `SELECT DISTINCT project FROM api_calls WHERE timestamp >= ? AND project IS NOT NULL`,
      [timestamp]
    );

    return results.map(r => r.project);
  }
}

module.exports = BaselineCalculator;
