/**
 * ToastyKey MCP Server
 * Exposes ToastyKey functionality to Claude Code via Model Context Protocol
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { TOOLS } = require('./tools');

class ToastyKeyMCP {
  constructor(database, vault, pricing) {
    this.db = database;
    this.vault = vault;
    this.pricing = pricing;

    this.server = new Server(
      {
        name: 'toastykey',
        version: '0.3.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: TOOLS };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        let result;

        switch (name) {
          case 'get_spend_summary':
            result = await this.getSpendSummary(args.period);
            break;

          case 'get_project_cost':
            result = await this.getProjectCost(args.project_path);
            break;

          case 'get_session_cost':
            result = await this.getSessionCost(args.session_id);
            break;

          case 'set_budget':
            result = await this.setBudget(args);
            break;

          case 'get_budget_status':
            result = await this.getBudgetStatus(args);
            break;

          case 'list_keys':
            result = await this.listKeys();
            break;

          case 'add_key':
            result = await this.addKey(args);
            break;

          case 'get_anomaly_log':
            result = await this.getAnomalyLog(args);
            break;

          case 'get_provider_stats':
            result = await this.getProviderStats(args);
            break;

          case 'get_cost_breakdown':
            result = await this.getCostBreakdown(args);
            break;

          case 'pause_provider':
            result = await this.pauseProvider(args);
            break;

          case 'resume_provider':
            result = await this.resumeProvider(args);
            break;

          case 'get_recommendations':
            result = await this.getRecommendations(args);
            break;

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: `Unknown tool: ${name}` }),
                },
              ],
              isError: true,
            };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`Error executing tool ${request.params.name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: error.message }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  // ============ TOOL IMPLEMENTATIONS ============

  /**
   * Get spend summary for a time period
   */
  async getSpendSummary(period) {
    try {
      // Get total spend
      const totalSpend = await this.db.getTotalSpend(period);

      // Get breakdown by provider
      const byProvider = await this.db.getSpendByProvider(
        this._getPeriodSince(period)
      );

      // Check if there's a global budget for this period
      let budgetInfo = null;
      const periodMap = { today: 'day', week: 'week', month: 'month' };
      const budget = await this.db.getBudget('global', null, periodMap[period]);

      if (budget) {
        const remaining = budget.limit_amount - budget.current_spend;
        const percentUsed = (budget.current_spend / budget.limit_amount) * 100;

        budgetInfo = {
          limit: budget.limit_amount,
          spent: budget.current_spend,
          remaining,
          percent_used: Math.round(percentUsed * 100) / 100,
          alert: percentUsed >= 80 ? 'warning' : percentUsed >= 100 ? 'exceeded' : 'ok'
        };
      }

      return {
        period,
        total_spend_inr: totalSpend,
        breakdown_by_provider: byProvider,
        budget: budgetInfo
      };
    } catch (error) {
      throw new Error(`Failed to get spend summary: ${error.message}`);
    }
  }

  /**
   * Get cost for a specific project
   */
  async getProjectCost(projectPath) {
    try {
      // Get or create project record
      let project = await this.db.getProject(projectPath);

      if (!project) {
        return {
          project_path: projectPath,
          exists: false,
          message: 'Project not found in database. No API calls logged yet.'
        };
      }

      // Get recent API calls for this project
      const recentCalls = await this.db.getApiCalls({
        project: projectPath,
        limit: 10
      });

      // Calculate total cost from api_calls table
      const calls = await this.db.getApiCalls({
        project: projectPath,
        limit: 1000
      });

      const totalCost = calls.reduce((sum, call) => sum + (call.cost_inr || 0), 0);

      return {
        project_path: projectPath,
        project_name: project.name,
        total_cost_inr: Math.round(totalCost * 100) / 100,
        created_at: project.created_at,
        recent_calls: recentCalls.map(call => ({
          timestamp: call.timestamp,
          provider: call.provider,
          model: call.model,
          cost_inr: call.cost_inr,
          tokens: call.input_tokens + call.output_tokens
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get project cost: ${error.message}`);
    }
  }

  /**
   * Get cost for a specific session
   */
  async getSessionCost(sessionId) {
    try {
      // If no sessionId provided, try to get current session
      // For now, we'll require a sessionId
      if (!sessionId) {
        return {
          message: 'No session_id provided. Please specify a session ID or start tracking a session first.'
        };
      }

      // Get session details
      const session = await this.db.db.get(
        'SELECT * FROM sessions WHERE id = ?',
        [sessionId]
      );

      if (!session) {
        return {
          session_id: sessionId,
          exists: false,
          message: 'Session not found'
        };
      }

      // Get all API calls for this session
      const calls = await this.db.getApiCalls({
        limit: 10000 // High limit to get all calls
      });

      const sessionCalls = calls.filter(call => call.session_id === sessionId);
      const totalCost = sessionCalls.reduce((sum, call) => sum + (call.cost_inr || 0), 0);

      // Calculate session duration
      const startTime = new Date(session.started_at);
      const endTime = session.ended_at ? new Date(session.ended_at) : new Date();
      const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);

      return {
        session_id: sessionId,
        project_id: session.project_id,
        tool: session.tool,
        started_at: session.started_at,
        ended_at: session.ended_at,
        duration_minutes: durationMinutes,
        status: session.ended_at ? 'ended' : 'active',
        total_cost_inr: Math.round(totalCost * 100) / 100,
        call_count: sessionCalls.length
      };
    } catch (error) {
      throw new Error(`Failed to get session cost: ${error.message}`);
    }
  }

  /**
   * Create or update a budget
   */
  async setBudget(args) {
    try {
      const { scope, scope_id = null, period, limit_amount } = args;

      // Validate inputs
      if (!['global', 'project', 'session'].includes(scope)) {
        throw new Error('Invalid scope. Must be: global, project, or session');
      }

      if (!['day', 'week', 'month'].includes(period)) {
        throw new Error('Invalid period. Must be: day, week, or month');
      }

      if (typeof limit_amount !== 'number' || limit_amount <= 0) {
        throw new Error('limit_amount must be a positive number');
      }

      // Check if budget already exists
      const existing = await this.db.getBudget(scope, scope_id, period);

      if (existing) {
        // Update existing budget
        await this.db.db.run(
          'UPDATE budgets SET limit_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [limit_amount, existing.id]
        );

        return {
          action: 'updated',
          budget_id: existing.id,
          scope,
          scope_id,
          period,
          limit_amount,
          current_spend: existing.current_spend,
          remaining: limit_amount - existing.current_spend
        };
      } else {
        // Create new budget
        const budgetId = await this.db.addBudget({
          scope,
          scope_id,
          period,
          limit_amount
        });

        return {
          action: 'created',
          budget_id: budgetId,
          scope,
          scope_id,
          period,
          limit_amount,
          current_spend: 0,
          remaining: limit_amount
        };
      }
    } catch (error) {
      throw new Error(`Failed to set budget: ${error.message}`);
    }
  }

  /**
   * Get budget status
   */
  async getBudgetStatus(args) {
    try {
      const { scope, scope_id = null, period } = args;

      const budget = await this.db.getBudget(scope, scope_id, period);

      if (!budget) {
        return {
          exists: false,
          scope,
          scope_id,
          period,
          message: 'No budget set for this scope and period'
        };
      }

      const remaining = budget.limit_amount - budget.current_spend;
      const percentUsed = (budget.current_spend / budget.limit_amount) * 100;

      let alertStatus = 'ok';
      let alertMessage = null;

      if (percentUsed >= 100) {
        alertStatus = 'exceeded';
        alertMessage = 'Budget exceeded! Consider reviewing API usage.';
      } else if (percentUsed >= 80) {
        alertStatus = 'warning';
        alertMessage = 'Warning: 80% of budget used.';
      }

      return {
        exists: true,
        budget_id: budget.id,
        scope,
        scope_id,
        period,
        limit_amount: budget.limit_amount,
        current_spend: budget.current_spend,
        remaining,
        percent_used: Math.round(percentUsed * 100) / 100,
        alert_status: alertStatus,
        alert_message: alertMessage,
        created_at: budget.created_at,
        updated_at: budget.updated_at
      };
    } catch (error) {
      throw new Error(`Failed to get budget status: ${error.message}`);
    }
  }

  /**
   * List all stored API keys (metadata only)
   */
  async listKeys() {
    try {
      const keys = await this.vault.listKeys();

      return {
        count: keys.length,
        keys: keys.map(key => ({
          id: key.id,
          provider: key.provider,
          label: key.label,
          created_at: key.created_at,
          last_used: key.last_used,
          status: key.status,
          total_cost: key.total_cost
        }))
      };
    } catch (error) {
      throw new Error(`Failed to list keys: ${error.message}`);
    }
  }

  /**
   * Add a new API key to the vault
   */
  async addKey(args) {
    try {
      const { provider, label, api_key } = args;

      if (!provider || !label || !api_key) {
        throw new Error('provider, label, and api_key are all required');
      }

      const result = await this.vault.addKey(provider, label, api_key);

      if (!result.success) {
        throw new Error(result.error || 'Failed to add key');
      }

      return {
        success: true,
        id: result.id,
        provider,
        label,
        message: 'API key encrypted and stored successfully'
      };
    } catch (error) {
      throw new Error(`Failed to add key: ${error.message}`);
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Convert period to a timestamp string for SQL queries
   */
  async getAnomalyLog(args) {
    const { limit = 10, trigger_type } = args;

    let query = `
      SELECT
        te.*,
        t.trigger_type,
        t.name as trigger_name,
        t.scope
      FROM trigger_events te
      JOIN triggers t ON te.trigger_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (trigger_type) {
      query += ' AND t.trigger_type = ?';
      params.push(trigger_type);
    }

    query += ' ORDER BY te.timestamp DESC LIMIT ?';
    params.push(limit);

    const events = await this.db.all(query, params);

    events.forEach(e => {
      e.details = JSON.parse(e.details);
    });

    return {
      events,
      total: events.length
    };
  }

  async getProviderStats(args) {
    const { provider, period = 'week' } = args;

    const since = this._getPeriodSince(period);
    if (!since) {
      throw new Error(`Invalid period: ${period}`);
    }

    const stats = await this.db.get(`
      SELECT
        COUNT(*) as total_calls,
        SUM(cost_usd) as total_cost_usd,
        SUM(cost_inr) as total_cost_inr,
        AVG(latency_ms) as avg_latency,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count,
        ROUND(SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as error_rate
      FROM api_calls
      WHERE provider = ? AND timestamp >= ?
    `, [provider, since]);

    const models = await this.db.all(`
      SELECT
        model,
        COUNT(*) as calls,
        SUM(cost_usd) as cost
      FROM api_calls
      WHERE provider = ? AND timestamp >= ?
      GROUP BY model
      ORDER BY cost DESC
    `, [provider, since]);

    return {
      provider,
      period,
      stats: {
        total_calls: stats.total_calls || 0,
        total_cost_usd: stats.total_cost_usd || 0,
        total_cost_inr: stats.total_cost_inr || 0,
        avg_latency_ms: stats.avg_latency || 0,
        error_count: stats.error_count || 0,
        error_rate: stats.error_rate || 0
      },
      models
    };
  }

  async getCostBreakdown(args) {
    const { period = 'week', group_by = 'provider' } = args;

    const since = this._getPeriodSince(period);
    if (!since) {
      throw new Error(`Invalid period: ${period}`);
    }

    let query;
    if (group_by === 'provider') {
      query = `
        SELECT
          provider as group_name,
          COUNT(*) as calls,
          SUM(cost_usd) as cost
        FROM api_calls
        WHERE timestamp >= ?
        GROUP BY provider
        ORDER BY cost DESC
      `;
    } else if (group_by === 'model') {
      query = `
        SELECT
          model as group_name,
          COUNT(*) as calls,
          SUM(cost_usd) as cost
        FROM api_calls
        WHERE timestamp >= ?
        GROUP BY model
        ORDER BY cost DESC
      `;
    } else if (group_by === 'project') {
      query = `
        SELECT
          project as group_name,
          COUNT(*) as calls,
          SUM(cost_usd) as cost
        FROM api_calls
        WHERE timestamp >= ? AND project IS NOT NULL
        GROUP BY project
        ORDER BY cost DESC
      `;
    }

    const breakdown = await this.db.all(query, [since]);

    const topCalls = await this.db.all(`
      SELECT
        provider,
        model,
        cost_usd,
        timestamp
      FROM api_calls
      WHERE timestamp >= ?
      ORDER BY cost_usd DESC
      LIMIT 5
    `, [since]);

    return {
      period,
      group_by,
      breakdown,
      top_expensive_calls: topCalls
    };
  }

  async pauseProvider(args) {
    const { provider, reason = 'manual_pause' } = args;

    // Insert pause state
    await this.db.run(`
      INSERT OR REPLACE INTO pause_states (entity_type, entity_id, reason)
      VALUES (?, ?, ?)
    `, ['provider', provider, reason]);

    return {
      success: true,
      provider,
      reason,
      message: `Provider '${provider}' has been paused`,
      resume_endpoint: `/api/triggers/resume/provider/${provider}`
    };
  }

  async resumeProvider(args) {
    const { provider } = args;

    // Delete pause state
    await this.db.run(`
      DELETE FROM pause_states
      WHERE entity_type = 'provider' AND entity_id = ?
    `, [provider]);

    return {
      success: true,
      provider,
      message: `Provider '${provider}' has been resumed`
    };
  }

  async getRecommendations(args) {
    const { category = 'all' } = args;

    const recommendations = [];

    // 1. Unused keys
    if (category === 'all' || category === 'unused_key') {
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
    }

    // 2. High error rate providers
    if (category === 'all' || category === 'high_error_rate') {
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
    }

    // 3. Cheaper model suggestions
    if (category === 'all' || category === 'cheaper_model') {
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
    }

    return {
      category,
      recommendations,
      total: recommendations.length
    };
  }

  _getPeriodSince(period) {
    const now = new Date();
    let since;

    switch (period) {
      case 'today':
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return null;
    }

    return since.toISOString();
  }

  /**
   * Start the MCP server
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ToastyKey MCP server running on stdio');
  }
}

module.exports = ToastyKeyMCP;
