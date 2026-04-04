/**
 * ToastyKey MCP Tool Definitions
 * Defines the 7 core tools exposed to Claude Code via MCP protocol
 */

const TOOLS = [
  {
    name: 'get_spend_summary',
    description: 'Get current API spend summary for a specific time period (today, week, or month). Returns total spend, breakdown by provider, and comparison to budget if set.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'week', 'month'],
          description: 'Time period to summarize spend for'
        }
      },
      required: ['period']
    }
  },

  {
    name: 'get_project_cost',
    description: 'Get total API cost for a specific project by directory path. Returns cumulative spend and recent activity.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project_path']
    }
  },

  {
    name: 'get_session_cost',
    description: 'Get API cost for a specific session or the current active session. Returns session details, duration, and total spend.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'number',
          description: 'Session ID to query. If not provided, returns current session cost.'
        }
      },
      required: []
    }
  },

  {
    name: 'set_budget',
    description: 'Create or update a budget cap for global, project, or session scope. Budget limits prevent overspending.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['global', 'project', 'session'],
          description: 'Scope of the budget (global, project, or session)'
        },
        scope_id: {
          type: 'string',
          description: 'ID of the scope (project path or session ID). Required for project/session scopes, null for global.'
        },
        period: {
          type: 'string',
          enum: ['day', 'week', 'month'],
          description: 'Time period for the budget'
        },
        limit_amount: {
          type: 'number',
          description: 'Budget limit in INR'
        }
      },
      required: ['scope', 'period', 'limit_amount']
    }
  },

  {
    name: 'get_budget_status',
    description: 'Check budget status for a specific scope and period. Returns remaining budget, percentage used, and alert status.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['global', 'project', 'session'],
          description: 'Scope of the budget to check'
        },
        scope_id: {
          type: 'string',
          description: 'ID of the scope (project path or session ID). Required for project/session scopes.'
        },
        period: {
          type: 'string',
          enum: ['day', 'week', 'month'],
          description: 'Time period to check'
        }
      },
      required: ['scope', 'period']
    }
  },

  {
    name: 'list_keys',
    description: 'List all stored API keys with metadata (provider, label, creation date, last used, total cost). Does NOT return actual key values for security.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  {
    name: 'add_key',
    description: 'Store a new API key in the encrypted vault. Keys are encrypted using AES-256-GCM before storage.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Provider name (e.g., "openai", "anthropic", "google")'
        },
        label: {
          type: 'string',
          description: 'Human-readable label for the key (e.g., "production", "dev", "personal")'
        },
        api_key: {
          type: 'string',
          description: 'The actual API key to encrypt and store'
        }
      },
      required: ['provider', 'label', 'api_key']
    }
  }
];

module.exports = { TOOLS };
