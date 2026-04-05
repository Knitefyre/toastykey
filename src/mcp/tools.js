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
  },

  {
    name: 'get_anomaly_log',
    description: 'Get recent anomaly detection events from triggers (rate spikes, cost spikes, error storms, etc.). Returns event history with details.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of events to return (default: 10)',
          default: 10
        },
        trigger_type: {
          type: 'string',
          enum: ['rate_spike', 'cost_spike', 'error_storm', 'token_explosion', 'silent_drain', 'new_provider'],
          description: 'Filter by specific trigger type (optional)'
        }
      },
      required: []
    }
  },

  {
    name: 'get_provider_stats',
    description: 'Get detailed statistics for a specific API provider including total spend, call count, error rate, and average latency.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Provider name (e.g., "openai", "anthropic", "elevenlabs")'
        },
        period: {
          type: 'string',
          enum: ['today', 'week', 'month', 'all'],
          description: 'Time period for statistics',
          default: 'week'
        }
      },
      required: ['provider']
    }
  },

  {
    name: 'get_cost_breakdown',
    description: 'Get detailed cost breakdown by provider, model, and project. Returns top expensive calls and usage patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'week', 'month'],
          description: 'Time period to analyze',
          default: 'week'
        },
        group_by: {
          type: 'string',
          enum: ['provider', 'model', 'project'],
          description: 'How to group the breakdown',
          default: 'provider'
        }
      },
      required: []
    }
  },

  {
    name: 'pause_provider',
    description: 'Pause API calls to a specific provider. Useful when detecting anomalies or needing to temporarily stop usage.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Provider name to pause (e.g., "openai", "anthropic")'
        },
        reason: {
          type: 'string',
          description: 'Reason for pausing (optional)',
          default: 'manual_pause'
        }
      },
      required: ['provider']
    }
  },

  {
    name: 'resume_provider',
    description: 'Resume API calls to a previously paused provider.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Provider name to resume (e.g., "openai", "anthropic")'
        }
      },
      required: ['provider']
    }
  },

  {
    name: 'get_recommendations',
    description: 'Get AI-powered cost optimization recommendations based on usage patterns (unused keys, expensive models, high error rates).',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'unused_key', 'high_error_rate', 'cheaper_model'],
          description: 'Filter recommendations by category',
          default: 'all'
        }
      },
      required: []
    }
  }
];

module.exports = { TOOLS };
