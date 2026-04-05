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

/**
 * Create all tables in the database
 * @param {Object} db - Promisified sqlite3 database instance
 */
async function createTables(db) {
  for (const tableSQL of module.exports.tables) {
    await db.run(tableSQL);
  }
  for (const indexSQL of module.exports.indexes) {
    await db.run(indexSQL);
  }
}

/**
 * Run database migrations to update schema
 * @param {Object} db - Promisified sqlite3 database instance
 */
async function runMigrations(db) {
  // Create baselines table
  const baselinesExists = await db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='baselines'"
  );

  if (!baselinesExists) {
    await db.run(`
      CREATE TABLE baselines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        scope TEXT NOT NULL,
        scope_id TEXT,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        sample_size INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, scope, scope_id, metric)
      )
    `);
    await db.run(`CREATE INDEX idx_baselines_lookup ON baselines(scope, scope_id, metric, date)`);
    console.log('[Migration] Created baselines table');
  }

  // Create pause_states table
  const pauseStatesExists = await db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='pause_states'"
  );

  if (!pauseStatesExists) {
    await db.run(`
      CREATE TABLE pause_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        paused_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        paused_by_trigger_id INTEGER,
        reason TEXT,
        UNIQUE(entity_type, entity_id)
      )
    `);
    console.log('[Migration] Created pause_states table');
  }

  // Create custom_providers table
  const customProvidersExists = await db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='custom_providers'"
  );

  if (!customProvidersExists) {
    await db.run(`
      CREATE TABLE custom_providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        base_url TEXT NOT NULL,
        auth_method TEXT NOT NULL,
        auth_header TEXT,
        cost_per_request REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Migration] Created custom_providers table');
  }

  // Create budget_overrides table
  const budgetOverridesExists = await db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='budget_overrides'"
  );

  if (!budgetOverridesExists) {
    await db.run(`
      CREATE TABLE budget_overrides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        budget_id INTEGER NOT NULL,
        additional_amount REAL NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (budget_id) REFERENCES budgets(id)
      )
    `);
    console.log('[Migration] Created budget_overrides table');
  }

  // Migrate triggers table
  const triggersColumns = await db.all("PRAGMA table_info(triggers)");
  const hasThresholdText = triggersColumns.find(c => c.name === 'threshold' && c.type === 'TEXT');
  const hasNameColumn = triggersColumns.find(c => c.name === 'name');

  if (!hasThresholdText || !hasNameColumn) {
    await db.run(`
      CREATE TABLE triggers_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL DEFAULT 'unnamed',
        trigger_type TEXT NOT NULL,
        scope TEXT NOT NULL,
        scope_id TEXT,
        threshold TEXT NOT NULL,
        action TEXT NOT NULL,
        webhook_url TEXT,
        enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.run(`
      INSERT INTO triggers_new (id, name, trigger_type, scope, scope_id, threshold, action, webhook_url, enabled, created_at)
      SELECT id, 'migrated-' || id, trigger_type, scope, scope_id, CAST(threshold AS TEXT), action, NULL, enabled, created_at
      FROM triggers
    `);
    await db.run(`DROP TABLE triggers`);
    await db.run(`ALTER TABLE triggers_new RENAME TO triggers`);
    console.log('[Migration] Migrated triggers table - threshold now TEXT, added name and webhook_url');
  }

  // Add columns to trigger_events
  const triggerEventsColumns = await db.all("PRAGMA table_info(trigger_events)");
  const hasEntityType = triggerEventsColumns.find(c => c.name === 'entity_type');

  if (!hasEntityType) {
    await db.run(`ALTER TABLE trigger_events ADD COLUMN entity_type TEXT`);
    await db.run(`ALTER TABLE trigger_events ADD COLUMN entity_id TEXT`);
    await db.run(`ALTER TABLE trigger_events ADD COLUMN metric_value REAL`);
    await db.run(`ALTER TABLE trigger_events ADD COLUMN baseline_value REAL`);
    console.log('[Migration] Added columns to trigger_events table');
  }

  // Add columns to budgets
  const budgetsColumns = await db.all("PRAGMA table_info(budgets)");
  const hasNotifyAt = budgetsColumns.find(c => c.name === 'notify_at_percent');

  if (!hasNotifyAt) {
    await db.run(`ALTER TABLE budgets ADD COLUMN notify_at_percent INTEGER DEFAULT 80`);
    await db.run(`ALTER TABLE budgets ADD COLUMN enforce INTEGER DEFAULT 0`);
    console.log('[Migration] Added columns to budgets table');
  }
}

module.exports.createTables = createTables;
module.exports.runMigrations = runMigrations;
