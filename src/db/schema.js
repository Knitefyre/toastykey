/**
 * ToastyKey Database Schema
 * SQLite schema for API cost tracking, key management, and budget monitoring
 */

module.exports = {
  // All table creation statements
  tables: [
    // API call logging
    `CREATE TABLE IF NOT EXISTS api_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      provider TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      project TEXT,
      session_id INTEGER,
      model TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      cost_inr REAL DEFAULT 0,
      status INTEGER DEFAULT 200,
      latency_ms INTEGER DEFAULT 0,
      request_data TEXT,
      response_data TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )`,

    // Encrypted API key storage
    `CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      label TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME,
      status TEXT DEFAULT 'active',
      total_cost REAL DEFAULT 0,
      UNIQUE(provider, label)
    )`,

    // Project tracking
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      directory_path TEXT NOT NULL UNIQUE,
      total_cost REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Session tracking
    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      tool TEXT DEFAULT 'unknown',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      total_cost REAL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )`,

    // Budget caps
    `CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL,
      scope_id TEXT,
      period TEXT NOT NULL,
      limit_amount REAL NOT NULL,
      current_spend REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Anomaly triggers
    `CREATE TABLE IF NOT EXISTS triggers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL,
      scope_id TEXT,
      trigger_type TEXT NOT NULL,
      threshold REAL NOT NULL,
      action TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Trigger event log
    `CREATE TABLE IF NOT EXISTS trigger_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      details TEXT,
      action_taken TEXT,
      FOREIGN KEY (trigger_id) REFERENCES triggers(id)
    )`,

    // Generated reports
    `CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period TEXT NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      html_content TEXT,
      summary_json TEXT
    )`
  ],

  // Performance indexes
  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_api_calls_timestamp ON api_calls(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_api_calls_provider ON api_calls(provider)',
    'CREATE INDEX IF NOT EXISTS idx_api_calls_project ON api_calls(project)',
    'CREATE INDEX IF NOT EXISTS idx_api_calls_session ON api_calls(session_id)'
  ]
};
