/**
 * ToastyKey Database Layer
 * Promisified sqlite3 wrapper with CRUD operations
 */

const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const schema = require('./schema');

class ToastyKeyDB {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.ready = new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
          reject(new Error(`Failed to open database: ${err.message}`));
          return;
        }

        // Create custom promisified wrappers
        const originalRun = this.db.run.bind(this.db);
        const originalGet = this.db.get.bind(this.db);
        const originalAll = this.db.all.bind(this.db);

        // Wrapper for run that captures lastID and changes
        this.db.run = function(sql, params = []) {
          return new Promise((resolve, reject) => {
            originalRun(sql, params, function(err) {
              if (err) reject(err);
              else resolve({ lastID: this.lastID, changes: this.changes });
            });
          });
        };

        // Promisify get and all
        this.db.get = promisify(originalGet);
        this.db.all = promisify(originalAll);

        try {
          await this._initSchema();
          resolve();
        } catch (initErr) {
          reject(initErr);
        }
      });
    });
  }

  async _initSchema() {
    try {
      // Enable WAL mode for better concurrent performance
      await this.db.run('PRAGMA journal_mode = WAL');

      // Create all tables
      for (const tableSQL of schema.tables) {
        await this.db.run(tableSQL);
      }

      // Create all indexes
      for (const indexSQL of schema.indexes) {
        await this.db.run(indexSQL);
      }

      // Run migrations
      await schema.runMigrations(this.db);
    } catch (err) {
      throw new Error(`Failed to initialize schema: ${err.message}`);
    }
  }

  // ============ API CALLS ============

  async logApiCall(data) {
    const {
      provider,
      endpoint,
      project = null,
      session_id = null,
      model = null,
      input_tokens = 0,
      output_tokens = 0,
      cost_usd = 0,
      cost_inr = 0,
      status = 200,
      latency_ms = 0,
      request_data = null,
      response_data = null
    } = data;

    const result = await this.db.run(
      `INSERT INTO api_calls (
        provider, endpoint, project, session_id, model,
        input_tokens, output_tokens, cost_usd, cost_inr,
        status, latency_ms, request_data, response_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        provider, endpoint, project, session_id, model,
        input_tokens, output_tokens, cost_usd, cost_inr,
        status, latency_ms, request_data, response_data
      ]
    );

    return result.lastID;
  }

  async getApiCalls(options = {}) {
    const { provider, project, since, limit = 100 } = options;

    let query = 'SELECT * FROM api_calls WHERE 1=1';
    const params = [];

    if (provider) {
      query += ' AND provider = ?';
      params.push(provider);
    }

    if (project) {
      query += ' AND project = ?';
      params.push(project);
    }

    if (since) {
      query += ' AND timestamp >= ?';
      params.push(since);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    return await this.db.all(query, params);
  }

  // ============ API KEYS ============

  async addApiKey(data) {
    const {
      provider,
      label,
      encrypted_key,
      iv,
      auth_tag
    } = data;

    const result = await this.db.run(
      `INSERT INTO api_keys (provider, label, encrypted_key, iv, auth_tag)
       VALUES (?, ?, ?, ?, ?)`,
      [provider, label, encrypted_key, iv, auth_tag]
    );

    return result.lastID;
  }

  async getApiKey(provider, label) {
    return await this.db.get(
      'SELECT * FROM api_keys WHERE provider = ? AND label = ?',
      [provider, label]
    );
  }

  async listApiKeys() {
    return await this.db.all(
      'SELECT id, provider, label, created_at, last_used, status, total_cost FROM api_keys ORDER BY provider, label'
    );
  }

  async deleteApiKey(id) {
    const result = await this.db.run(
      'DELETE FROM api_keys WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      throw new Error(`API key with id ${id} not found`);
    }

    return result.changes;
  }

  async updateKeyLastUsed(id) {
    const result = await this.db.run(
      'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      throw new Error(`API key with id ${id} not found`);
    }

    return result.changes;
  }

  // ============ PROJECTS ============

  async addProject(name, directoryPath) {
    try {
      const result = await this.db.run(
        'INSERT INTO projects (name, directory_path) VALUES (?, ?)',
        [name, directoryPath]
      );
      return result.lastID;
    } catch (err) {
      // If unique constraint fails, update existing
      if (err.code === 'SQLITE_CONSTRAINT') {
        const existing = await this.db.get(
          'SELECT id FROM projects WHERE directory_path = ?',
          [directoryPath]
        );
        return existing ? existing.id : null;
      }
      throw err;
    }
  }

  async getProject(directoryPath) {
    return await this.db.get(
      'SELECT * FROM projects WHERE directory_path = ?',
      [directoryPath]
    );
  }

  async getAllProjects() {
    return await this.db.all(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );
  }

  // ============ SESSIONS ============

  async createSession(projectId, tool = 'unknown') {
    const result = await this.db.run(
      'INSERT INTO sessions (project_id, tool) VALUES (?, ?)',
      [projectId, tool]
    );

    return result.lastID;
  }

  async endSession(sessionId) {
    const result = await this.db.run(
      'UPDATE sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sessionId]
    );

    if (result.changes === 0) {
      throw new Error(`Session with id ${sessionId} not found`);
    }

    return result.changes;
  }

  // ============ BUDGETS ============

  async addBudget(data) {
    const {
      scope,
      scope_id = null,
      period,
      limit_amount
    } = data;

    const result = await this.db.run(
      `INSERT INTO budgets (scope, scope_id, period, limit_amount)
       VALUES (?, ?, ?, ?)`,
      [scope, scope_id, period, limit_amount]
    );

    return result.lastID;
  }

  async getBudget(scope, scopeId, period) {
    if (scopeId === null) {
      return await this.db.get(
        'SELECT * FROM budgets WHERE scope = ? AND scope_id IS NULL AND period = ?',
        [scope, period]
      );
    }
    return await this.db.get(
      'SELECT * FROM budgets WHERE scope = ? AND scope_id = ? AND period = ?',
      [scope, scopeId, period]
    );
  }

  async updateBudgetSpend(id, amount) {
    const result = await this.db.run(
      `UPDATE budgets
       SET current_spend = current_spend + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [amount, id]
    );

    if (result.changes === 0) {
      throw new Error(`Budget with id ${id} not found`);
    }

    return result.changes;
  }

  // ============ BASELINES ============

  async createBaseline(data) {
    const {
      date,
      scope,
      scope_id = null,
      metric,
      value,
      sample_size
    } = data;

    const result = await this.db.run(
      `INSERT OR REPLACE INTO baselines (date, scope, scope_id, metric, value, sample_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [date, scope, scope_id, metric, value, sample_size]
    );

    return result.lastID;
  }

  async getBaseline(scope, scopeId, metric, daysBack = 7) {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dateStr = date.toISOString().split('T')[0];

    let query = `SELECT * FROM baselines WHERE scope = ? AND metric = ? AND date >= ?`;
    const params = [scope, metric, dateStr];

    if (scopeId === null || scopeId === undefined) {
      query += ` AND scope_id IS NULL`;
    } else {
      query += ` AND scope_id = ?`;
      params.push(scopeId);
    }

    query += ` ORDER BY date DESC LIMIT 1`;
    return await this.db.get(query, params);
  }

  async getBaselines(scope, scopeId, metric, days = 30) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const dateStr = date.toISOString().split('T')[0];

    let query = `SELECT * FROM baselines WHERE scope = ? AND metric = ? AND date >= ?`;
    const params = [scope, metric, dateStr];

    if (scopeId === null || scopeId === undefined) {
      query += ` AND scope_id IS NULL`;
    } else {
      query += ` AND scope_id = ?`;
      params.push(scopeId);
    }

    query += ` ORDER BY date ASC`;
    return await this.db.all(query, params);
  }

  // ============ PAUSE STATES ============

  async pauseEntity(data) {
    const {
      entity_type,
      entity_id,
      paused_by_trigger_id = null,
      reason = null
    } = data;

    const result = await this.db.run(
      `INSERT OR REPLACE INTO pause_states (entity_type, entity_id, paused_by_trigger_id, reason, paused_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [entity_type, entity_id, paused_by_trigger_id, reason]
    );

    return result.lastID;
  }

  async resumeEntity(entityType, entityId) {
    const result = await this.db.run(
      `DELETE FROM pause_states WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId]
    );

    if (result.changes === 0) {
      throw new Error(`No pause state found for ${entityType}:${entityId}`);
    }

    return result.changes;
  }

  async isPaused(entityType, entityId) {
    const result = await this.db.get(
      `SELECT * FROM pause_states WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId]
    );

    return result !== undefined;
  }

  async getPauseState(entityType, entityId) {
    return await this.db.get(
      `SELECT * FROM pause_states WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId]
    );
  }

  async getAllPausedEntities() {
    return await this.db.all(
      `SELECT * FROM pause_states ORDER BY paused_at DESC`
    );
  }

  // ============ CUSTOM PROVIDERS ============

  async createCustomProvider(data) {
    const {
      name,
      base_url,
      auth_method,
      auth_header = null,
      cost_per_request = null
    } = data;

    const result = await this.db.run(
      `INSERT INTO custom_providers (name, base_url, auth_method, auth_header, cost_per_request)
       VALUES (?, ?, ?, ?, ?)`,
      [name, base_url, auth_method, auth_header, cost_per_request]
    );

    return result.lastID;
  }

  async getCustomProvider(name) {
    return await this.db.get(
      `SELECT * FROM custom_providers WHERE name = ?`,
      [name]
    );
  }

  async listCustomProviders() {
    return await this.db.all(
      `SELECT * FROM custom_providers ORDER BY name`
    );
  }

  async deleteCustomProvider(id) {
    const result = await this.db.run(
      `DELETE FROM custom_providers WHERE id = ?`,
      [id]
    );

    if (result.changes === 0) {
      throw new Error(`Custom provider with id ${id} not found`);
    }

    return result.changes;
  }

  // ============ BUDGET OVERRIDES ============

  async createBudgetOverride(data) {
    const {
      budget_id,
      additional_amount,
      reason = null,
      expires_at = null
    } = data;

    const result = await this.db.run(
      `INSERT INTO budget_overrides (budget_id, additional_amount, reason, expires_at)
       VALUES (?, ?, ?, ?)`,
      [budget_id, additional_amount, reason, expires_at]
    );

    return result.lastID;
  }

  async getActiveBudgetOverride(budgetId) {
    return await this.db.get(
      `SELECT * FROM budget_overrides
       WHERE budget_id = ?
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       ORDER BY created_at DESC
       LIMIT 1`,
      [budgetId]
    );
  }

  async listBudgetOverrides(budgetId) {
    return await this.db.all(
      `SELECT * FROM budget_overrides
       WHERE budget_id = ?
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       ORDER BY created_at DESC`,
      [budgetId]
    );
  }

  // ============ AGGREGATIONS ============

  async getTotalSpend(period) {
    const query = this._buildPeriodQuery(period);
    const result = await this.db.get(
      `SELECT SUM(cost_inr) as total_cost
       FROM api_calls
       WHERE ${query.where}`,
      query.params
    );

    return result.total_cost || 0;
  }

  async getSpendByProvider(since = null) {
    let query = `
      SELECT
        provider,
        SUM(cost_inr) as total_inr
      FROM api_calls
    `;

    const params = [];
    if (since) {
      query += ' WHERE timestamp >= ?';
      params.push(since);
    }

    query += ' GROUP BY provider ORDER BY total_inr DESC';

    return await this.db.all(query, params);
  }

  async getSpendByProject(since = null) {
    let query = `
      SELECT
        project,
        SUM(cost_inr) as total_cost
      FROM api_calls
      WHERE project IS NOT NULL
    `;

    const params = [];
    if (since) {
      query += ' AND timestamp >= ?';
      params.push(since);
    }

    query += ' GROUP BY project ORDER BY total_cost DESC';

    return await this.db.all(query, params);
  }

  async getCallCount(period) {
    const query = this._buildPeriodQuery(period);
    const result = await this.db.get(
      `SELECT COUNT(*) as count
       FROM api_calls
       WHERE ${query.where}`,
      query.params
    );

    return result.count;
  }

  async getActiveProjectCount() {
    const result = await this.db.get(`
      SELECT COUNT(DISTINCT project) as count
      FROM api_calls
    `);

    return result.count;
  }

  async getActiveKeyCount() {
    const result = await this.db.get(`
      SELECT COUNT(*) as count
      FROM api_keys
      WHERE status = 'active'
    `);

    return result.count;
  }

  async getDailySpend(days) {
    const data = await this.db.all(`
      SELECT
        DATE(timestamp) as date,
        SUM(cost_inr) as total_inr,
        SUM(cost_usd) as total_usd,
        SUM(CASE WHEN provider = 'openai' THEN cost_inr ELSE 0 END) as openai,
        SUM(CASE WHEN provider = 'anthropic' THEN cost_inr ELSE 0 END) as anthropic
      FROM api_calls
      WHERE timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `, [days]);

    return data;
  }

  async getAllApiCalls() {
    return await this.db.all(`
      SELECT * FROM api_calls
    `);
  }

  async getRecentCalls(limit, offset) {
    return await this.db.all(`
      SELECT
        id,
        timestamp,
        provider,
        endpoint,
        model,
        project,
        cost_inr,
        cost_usd,
        status,
        latency_ms
      FROM api_calls
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
  }

  async getTotalCallCount() {
    const result = await this.db.get(`
      SELECT COUNT(*) as count FROM api_calls
    `);

    return result.count;
  }

  // ============ RAW DB PASS-THROUGHS ============
  // These allow API routes that call db.all/run/get directly to work

  async all(sql, params = []) {
    return this.db.all(sql, params);
  }

  async get(sql, params = []) {
    return this.db.get(sql, params);
  }

  async run(sql, params = []) {
    return this.db.run(sql, params);
  }

  // ============ UTILITY ============

  _buildPeriodQuery(period) {
    switch (period) {
      case 'all':
        return {
          where: '1=1',
          params: []
        };
      case 'today':
        return {
          where: "DATE(timestamp) = DATE('now')",
          params: []
        };
      case 'yesterday':
        return {
          where: "DATE(timestamp) = DATE('now', '-1 day')",
          params: []
        };
      case 'week':
        return {
          where: "timestamp >= DATE('now', '-7 days')",
          params: []
        };
      case 'month':
        return {
          where: "timestamp >= DATE('now', '-30 days')",
          params: []
        };
      default:
        throw new Error(`Invalid period: ${period}. Must be one of: 'all', 'today', 'yesterday', 'week', 'month'`);
    }
  }

  // ============ PROJECTS ============

  async getProject(pathOrId) {
    // Try by path first
    let project = await this.db.get(
      'SELECT * FROM projects WHERE directory_path = ?',
      [pathOrId]
    );

    // If not found, try by ID
    if (!project && typeof pathOrId === 'number') {
      project = await this.db.get(
        'SELECT * FROM projects WHERE id = ?',
        [pathOrId]
      );
    }

    return project || null;
  }

  async createProject(data) {
    const {
      name,
      path: projectPath,
      type = null,
      manifest_file = null,
      auto_detected = 0,
      detected_at = null
    } = data;

    const result = await this.db.run(
      `INSERT INTO projects (name, directory_path, type, manifest_file, auto_detected, detected_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, projectPath, type, manifest_file, auto_detected, detected_at]
    );

    return result.lastID;
  }

  async close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = ToastyKeyDB;
