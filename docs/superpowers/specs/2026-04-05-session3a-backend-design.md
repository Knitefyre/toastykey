# Session 3A: Backend - Anomaly Detection, Triggers, Reports, and Additional Providers

**Date:** 2026-04-05  
**Session:** 3A (Backend Only)  
**Branch:** feature/session3  
**Prerequisites:** Sessions 1, 2, and 2.5 complete

---

## Overview

Session 3A adds enterprise-grade monitoring, alerting, and reporting capabilities to ToastyKey. This is **backend only** - no React/frontend changes. Session 3B will integrate the dashboard UI.

### Goals

1. **Anomaly Detection Engine** - Monitor API patterns, detect 6 types of anomalies
2. **Trigger Actions System** - Execute actions when anomalies detected (pause, notify, webhook)
3. **Pause/Resume Middleware** - Block API calls from paused providers/projects
4. **Trigger Configuration API** - REST endpoints for managing triggers
5. **Report Generation** - Daily/weekly/monthly usage reports with HTML output
6. **Additional Providers** - Add 5 new providers (ElevenLabs, Cartesia, Replicate, Stability, Generic)
7. **Budget Enforcement** - Upgrade from warnings to actual blocking at 100%
8. **MCP Tools** - Add 6 new tools (total: 13)
9. **Comprehensive Testing** - Unit, integration, and API tests

---

## Architecture

### Modular Subsystems

```
src/
├── triggers/              # NEW: Anomaly detection engine
│   ├── detector.js        # Main detection loop (runs every 30s)
│   ├── actions.js         # Action executors
│   ├── types/             # Individual trigger implementations
│   │   ├── rate-spike.js
│   │   ├── cost-spike.js
│   │   ├── error-storm.js
│   │   ├── token-explosion.js
│   │   ├── silent-drain.js
│   │   └── new-provider.js
│   └── index.js           # Public API
│
├── reports/               # NEW: Report generation
│   ├── generator.js       # Report builder
│   ├── scheduler.js       # Auto-generation (cron)
│   ├── templates/         # Handlebars templates
│   │   ├── report.hbs
│   │   └── partials/
│   └── index.js           # Public API
│
├── baselines/             # NEW: Baseline calculations
│   ├── calculator.js      # Calculate 7-day averages
│   ├── storage.js         # CRUD for baselines table
│   └── index.js           # Public API
│
└── proxy/
    ├── handlers/
    │   ├── base.js        # NEW: Base handler class
    │   ├── elevenlabs.js  # NEW
    │   ├── cartesia.js    # NEW
    │   ├── replicate.js   # NEW
    │   ├── stability.js   # NEW
    │   └── generic.js     # NEW: Custom providers
    │
    └── api/
        ├── triggers.js    # NEW: Trigger CRUD + events
        └── reports.js     # NEW: Report generation + list
```

---

## Database Schema Updates

### New Tables

#### 1. `baselines` - Pre-calculated averages for anomaly detection

```sql
CREATE TABLE baselines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,              -- YYYY-MM-DD
  scope TEXT NOT NULL,              -- 'global', 'provider', 'project'
  scope_id TEXT,                    -- provider name or project path
  metric TEXT NOT NULL,             -- 'call_rate', 'cost_rate', 'error_rate', 'token_avg'
  value REAL NOT NULL,              -- calculated average
  sample_size INTEGER NOT NULL,    -- number of data points
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, scope, scope_id, metric)
);

CREATE INDEX idx_baselines_lookup ON baselines(scope, scope_id, metric, date);
```

#### 2. `pause_states` - Track paused providers/projects

```sql
CREATE TABLE pause_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,       -- 'provider', 'project'
  entity_id TEXT NOT NULL,         -- provider name or project path
  paused_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paused_by_trigger_id INTEGER,    -- NULL if manually paused
  reason TEXT,
  FOREIGN KEY (paused_by_trigger_id) REFERENCES trigger_events(id),
  UNIQUE(entity_type, entity_id)
);
```

#### 3. `custom_providers` - User-configured generic providers

```sql
CREATE TABLE custom_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  auth_method TEXT NOT NULL,       -- 'bearer', 'api_key', 'none'
  auth_header TEXT,                 -- 'Authorization', 'X-API-Key', etc.
  cost_per_request REAL,            -- flat rate in USD
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. `budget_overrides` - Temporary budget increases

```sql
CREATE TABLE budget_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL,
  additional_amount REAL NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (budget_id) REFERENCES budgets(id)
);
```

### Schema Changes to Existing Tables

#### `triggers` table modifications:
- **Change `threshold` column**: REAL → TEXT (stores JSON)
- Threshold JSON format:
  ```json
  {
    "multiplier": 5,
    "window_minutes": 2,
    "min_sample_size": 20,
    "cooldown_minutes": 10
  }
  ```

#### `trigger_events` table - Add columns:
```sql
ALTER TABLE trigger_events ADD COLUMN entity_type TEXT;
ALTER TABLE trigger_events ADD COLUMN entity_id TEXT;
ALTER TABLE trigger_events ADD COLUMN metric_value REAL;
ALTER TABLE trigger_events ADD COLUMN baseline_value REAL;
```

#### `budgets` table - Add columns:
```sql
ALTER TABLE budgets ADD COLUMN notify_at_percent INTEGER DEFAULT 80;
ALTER TABLE budgets ADD COLUMN enforce INTEGER DEFAULT 0;
```

---

## Component 1: Anomaly Detection Engine

### Architecture

**Location:** `src/triggers/`

**Lifecycle:** Integrated with proxy process
- Starts when proxy starts via `detector.start(db, wsServer)`
- Runs `setInterval` every 30 seconds
- Stops when proxy stops

### Components

#### 1.1 Detector Loop (`detector.js`)

```javascript
class AnomalyDetector {
  constructor(db, wsServer, baselines) {
    this.db = db;
    this.wsServer = wsServer;
    this.baselines = baselines;
    this.interval = null;
  }

  start() {
    // Run every 30 seconds
    this.interval = setInterval(() => this.check(), 30000);
    // Run immediately on start
    this.check();
  }

  async check() {
    // 1. Load enabled triggers
    const triggers = await this.db.all(
      'SELECT * FROM triggers WHERE enabled = 1'
    );

    // 2. For each trigger, run detection
    for (const trigger of triggers) {
      const handler = this.getTriggerHandler(trigger.trigger_type);
      const result = await handler.check(this.db, trigger, this.baselines);

      if (result && result.triggered) {
        // 3. Check cooldown
        if (await this.isCooledDown(trigger)) {
          // 4. Execute action
          await executeAction(this.db, this.wsServer, trigger, result);
        }
      }
    }
  }

  async isCooledDown(trigger) {
    const threshold = JSON.parse(trigger.threshold);
    const cooldown = threshold.cooldown_minutes || 10;

    const lastEvent = await this.db.get(
      `SELECT timestamp FROM trigger_events 
       WHERE trigger_id = ? 
       ORDER BY timestamp DESC LIMIT 1`,
      [trigger.id]
    );

    if (!lastEvent) return true;

    const minutesSince = (Date.now() - new Date(lastEvent.timestamp)) / 60000;
    return minutesSince >= cooldown;
  }
}
```

#### 1.2 Trigger Type Handlers (`src/triggers/types/`)

Each trigger type implements:
```javascript
async function check(db, trigger, baselines) {
  // Returns null if insufficient data
  // Returns { triggered: false } if within normal range
  // Returns { triggered: true, details: {...} } if anomaly detected
}
```

**Rate Spike** (`rate-spike.js`):
```javascript
async function check(db, trigger, baselines) {
  const threshold = JSON.parse(trigger.threshold);
  const { multiplier, window_minutes } = threshold;

  // Get current call rate (last window_minutes)
  const currentRate = await db.get(`
    SELECT COUNT(*) as calls
    FROM api_calls
    WHERE timestamp >= datetime('now', '-${window_minutes} minutes')
    ${trigger.scope === 'provider' ? `AND provider = '${trigger.scope_id}'` : ''}
    ${trigger.scope === 'project' ? `AND project = '${trigger.scope_id}'` : ''}
  `);

  // Get baseline (hybrid: stored + fresh)
  const baseline = await baselines.getRate(
    trigger.scope,
    trigger.scope_id,
    window_minutes
  );

  if (!baseline || baseline.sample_size < threshold.min_sample_size) {
    return null; // Not enough data
  }

  const callsPerMinute = currentRate.calls / window_minutes;
  const normalRate = baseline.value;

  if (callsPerMinute > normalRate * multiplier) {
    return {
      triggered: true,
      entity_type: trigger.scope === 'global' ? 'global' : trigger.scope,
      entity_id: trigger.scope_id,
      metric_value: callsPerMinute,
      baseline_value: normalRate,
      details: {
        current_rate: callsPerMinute,
        normal_rate: normalRate,
        multiplier_exceeded: callsPerMinute / normalRate,
        window_minutes
      }
    };
  }

  return { triggered: false };
}
```

**Cost Spike** (`cost-spike.js`):
- Similar to rate spike but checks `SUM(cost_usd)` per hour

**Error Storm** (`error-storm.js`):
```javascript
async function check(db, trigger, baselines) {
  const threshold = JSON.parse(trigger.threshold);
  const { threshold_percent, min_sample_size, window_minutes } = threshold;

  // Get recent calls
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors
    FROM api_calls
    WHERE timestamp >= datetime('now', '-${window_minutes} minutes')
    ${trigger.scope === 'provider' ? `AND provider = '${trigger.scope_id}'` : ''}
  `);

  if (stats.total < min_sample_size) return null;

  const errorRate = (stats.errors / stats.total) * 100;

  if (errorRate > threshold_percent) {
    return {
      triggered: true,
      entity_type: trigger.scope === 'global' ? 'global' : trigger.scope,
      entity_id: trigger.scope_id,
      metric_value: errorRate,
      baseline_value: threshold_percent,
      details: {
        error_rate: errorRate,
        threshold: threshold_percent,
        total_calls: stats.total,
        error_calls: stats.errors
      }
    };
  }

  return { triggered: false };
}
```

**Token Explosion** (`token-explosion.js`):
- Checks if any single call's token count exceeds average × multiplier

**Silent Drain** (`silent-drain.js`):
- Detects API calls with `session_id = NULL`
- No baseline needed, triggers if calls detected without session

**New Provider** (`new-provider.js`):
- Triggers on first call to a provider not in `api_calls` history
- No baseline needed

#### 1.3 Action Executor (`actions.js`)

```javascript
async function executeAction(db, wsServer, trigger, event) {
  // 1. Log event
  const eventId = await db.run(`
    INSERT INTO trigger_events (
      trigger_id, entity_type, entity_id, 
      metric_value, baseline_value, details, action_taken
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    trigger.id,
    event.entity_type,
    event.entity_id,
    event.metric_value,
    event.baseline_value,
    JSON.stringify(event.details),
    trigger.action
  ]).lastID;

  // 2. Execute action
  const actions = {
    log_only: async () => {
      // Already logged above
    },

    dashboard_notify: async () => {
      wsServer.emit('anomaly_detected', {
        trigger_id: trigger.id,
        event_id: eventId,
        type: trigger.trigger_type,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        details: event.details,
        timestamp: new Date().toISOString()
      });
    },

    claude_code_alert: async () => {
      // Flag for MCP tool - store with special marker
      await db.run(`
        UPDATE trigger_events 
        SET action_taken = 'claude_code_alert_pending'
        WHERE id = ?
      `, [eventId]);
    },

    auto_pause: async () => {
      await db.run(`
        INSERT OR REPLACE INTO pause_states 
        (entity_type, entity_id, paused_by_trigger_id, reason)
        VALUES (?, ?, ?, ?)
      `, [event.entity_type, event.entity_id, eventId, 'auto_pause']);

      wsServer.emit('entity_paused', {
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        reason: 'auto_pause',
        trigger_type: trigger.trigger_type
      });
    },

    auto_kill: async () => {
      await db.run(`
        INSERT OR REPLACE INTO pause_states 
        (entity_type, entity_id, paused_by_trigger_id, reason)
        VALUES (?, ?, ?, ?)
      `, [event.entity_type, event.entity_id, eventId, 'auto_kill']);

      wsServer.emit('entity_paused', {
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        reason: 'auto_kill',
        trigger_type: trigger.trigger_type
      });
    },

    webhook: async () => {
      try {
        await axios.post(trigger.webhook_url, {
          trigger_id: trigger.id,
          event_id: eventId,
          type: trigger.trigger_type,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          details: event.details,
          timestamp: new Date().toISOString()
        }, {
          timeout: 5000
        });
      } catch (error) {
        console.error('Webhook failed:', error.message);
      }
    }
  };

  await actions[trigger.action]();
}
```

---

## Component 2: Baseline Calculator

### Architecture

**Location:** `src/baselines/`

### Components

#### 2.1 Calculator (`calculator.js`)

```javascript
class BaselineCalculator {
  constructor(db) {
    this.db = db;
    this.updateInterval = null;
  }

  start() {
    // Update baselines every hour
    this.updateInterval = setInterval(() => this.updateAll(), 3600000);
    // Run immediately on start
    this.updateAll();
  }

  async updateAll() {
    // Calculate and store baselines for:
    // - Global scope
    // - Each provider
    // - Each project

    await this.calculateGlobalBaselines();
    await this.calculateProviderBaselines();
    await this.calculateProjectBaselines();
  }

  async calculateGlobalBaselines() {
    const metrics = ['call_rate', 'cost_rate', 'error_rate', 'token_avg'];

    for (const metric of metrics) {
      const value = await this.calculateMetric('global', null, metric);
      if (value !== null) {
        await this.storeBaseline('global', null, metric, value);
      }
    }
  }

  async calculateMetric(scope, scopeId, metric) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    let query = '';
    const params = [];

    switch (metric) {
      case 'call_rate':
        // Average calls per hour over last 7 days
        query = `
          SELECT 
            COUNT(*) as total_calls,
            (julianday('now') - julianday(MIN(timestamp))) * 24 as hours
          FROM api_calls
          WHERE timestamp >= ?
        `;
        params.push(sevenDaysAgo.toISOString());
        break;

      case 'cost_rate':
        // Average cost per hour
        query = `
          SELECT 
            SUM(cost_usd) as total_cost,
            (julianday('now') - julianday(MIN(timestamp))) * 24 as hours
          FROM api_calls
          WHERE timestamp >= ?
        `;
        params.push(sevenDaysAgo.toISOString());
        break;

      case 'error_rate':
        // Error percentage
        query = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors
          FROM api_calls
          WHERE timestamp >= ?
        `;
        params.push(sevenDaysAgo.toISOString());
        break;

      case 'token_avg':
        // Average tokens per call
        query = `
          SELECT 
            AVG(input_tokens + output_tokens) as avg_tokens,
            COUNT(*) as sample_size
          FROM api_calls
          WHERE timestamp >= ?
          AND (input_tokens > 0 OR output_tokens > 0)
        `;
        params.push(sevenDaysAgo.toISOString());
        break;
    }

    // Add scope filters
    if (scope === 'provider' && scopeId) {
      query += ` AND provider = ?`;
      params.push(scopeId);
    } else if (scope === 'project' && scopeId) {
      query += ` AND project = ?`;
      params.push(scopeId);
    }

    const result = await this.db.get(query, params);

    // Calculate final value based on metric type
    if (metric === 'call_rate') {
      return result.hours > 0 ? result.total_calls / result.hours : null;
    } else if (metric === 'cost_rate') {
      return result.hours > 0 ? result.total_cost / result.hours : null;
    } else if (metric === 'error_rate') {
      return result.total > 0 ? (result.errors / result.total) * 100 : null;
    } else if (metric === 'token_avg') {
      return result.sample_size > 10 ? result.avg_tokens : null;
    }

    return null;
  }

  async storeBaseline(scope, scopeId, metric, value) {
    const today = new Date().toISOString().split('T')[0];
    const sampleSize = await this.getSampleSize(scope, scopeId);

    await this.db.run(`
      INSERT OR REPLACE INTO baselines 
      (date, scope, scope_id, metric, value, sample_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [today, scope, scopeId, metric, value, sampleSize]);
  }
}
```

#### 2.2 Storage (`storage.js`)

```javascript
class BaselineStorage {
  constructor(db) {
    this.db = db;
  }

  async getRate(scope, scopeId, windowMinutes) {
    // Hybrid approach: use stored baseline + fresh calculation for last 24h

    // Get stored baseline (older than 24h)
    const stored = await this.db.get(`
      SELECT AVG(value) as value, SUM(sample_size) as sample_size
      FROM baselines
      WHERE scope = ? 
      AND scope_id ${scopeId ? '= ?' : 'IS NULL'}
      AND metric = 'call_rate'
      AND date >= date('now', '-7 days')
      AND date < date('now', '-1 day')
    `, scopeId ? [scope, scopeId] : [scope]);

    // Calculate fresh for last 24h
    const fresh = await this.db.get(`
      SELECT COUNT(*) / 24.0 as rate
      FROM api_calls
      WHERE timestamp >= datetime('now', '-24 hours')
      ${scope === 'provider' ? `AND provider = '${scopeId}'` : ''}
      ${scope === 'project' ? `AND project = '${scopeId}'` : ''}
    `);

    // Blend stored (70%) and fresh (30%)
    if (stored && stored.value && fresh && fresh.rate) {
      return {
        value: (stored.value * 0.7 + fresh.rate * 0.3) * (60 / windowMinutes),
        sample_size: stored.sample_size
      };
    }

    return null;
  }

  async getCost(scope, scopeId, windowMinutes) {
    // Similar to getRate but for cost
  }

  async getErrorRate(scope, scopeId) {
    // Error rate baseline
  }

  async getTokenAverage(scope, scopeId) {
    // Token average baseline
  }
}
```

---

## Component 3: Pause/Resume Middleware

### Middleware (`src/proxy/middleware.js`)

```javascript
function checkPauseState(db) {
  return async (req, res, next) => {
    // Extract provider from URL path
    const provider = req.path.split('/')[1]; // /openai/* -> 'openai'
    req.toastykey = req.toastykey || {};
    req.toastykey.provider = provider;

    // Check if provider is paused
    const providerPause = await db.get(`
      SELECT * FROM pause_states 
      WHERE entity_type = 'provider' AND entity_id = ?
    `, [provider]);

    if (providerPause) {
      return res.status(429).json({
        error: 'ToastyKey: API calls paused',
        reason: 'anomaly_detected',
        trigger: providerPause.reason,
        paused_at: providerPause.paused_at,
        resume_endpoint: `POST /api/triggers/resume/provider/${provider}`
      });
    }

    // Check if project is paused (if project detected)
    if (req.toastykey.project) {
      const projectPause = await db.get(`
        SELECT * FROM pause_states 
        WHERE entity_type = 'project' AND entity_id = ?
      `, [req.toastykey.project]);

      if (projectPause) {
        return res.status(429).json({
          error: 'ToastyKey: API calls paused',
          reason: 'anomaly_detected',
          trigger: projectPause.reason,
          paused_at: projectPause.paused_at,
          project: req.toastykey.project,
          resume_endpoint: `POST /api/triggers/resume/project/${encodeURIComponent(req.toastykey.project)}`
        });
      }
    }

    next();
  };
}
```

**Middleware Order** in `src/proxy/index.js`:
```javascript
app.use(express.json());
app.use(detectProject(db));       // 1. Detect project
app.use(checkPauseState(db));     // 2. Check pause (NEW)
app.use(checkBudgets(db, wsServer)); // 3. Check budgets
```

---

## Component 4: Trigger Configuration API

### REST Endpoints (`src/proxy/api/triggers.js`)

```javascript
const express = require('express');
const router = express.Router();

function createTriggersRouter(db, wsServer) {
  // GET /api/triggers - List all triggers
  router.get('/', async (req, res) => {
    try {
      const { scope, enabled } = req.query;
      
      let query = 'SELECT * FROM triggers WHERE 1=1';
      const params = [];

      if (scope) {
        query += ' AND scope = ?';
        params.push(scope);
      }
      if (enabled !== undefined) {
        query += ' AND enabled = ?';
        params.push(enabled === 'true' ? 1 : 0);
      }

      query += ' ORDER BY created_at DESC';

      const triggers = await db.all(query, params);

      // Parse threshold JSON
      triggers.forEach(t => {
        t.threshold = JSON.parse(t.threshold);
      });

      res.json({ triggers });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/triggers - Create new trigger
  router.post('/', async (req, res) => {
    try {
      const { scope, scope_id, trigger_type, threshold, action, webhook_url, enabled } = req.body;

      // Validate required fields
      if (!scope || !trigger_type || !threshold || !action) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['scope', 'trigger_type', 'threshold', 'action']
        });
      }

      // Validate threshold structure based on trigger type
      const validationError = validateThreshold(trigger_type, threshold);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const result = await db.run(`
        INSERT INTO triggers (scope, scope_id, trigger_type, threshold, action, webhook_url, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        scope,
        scope_id || null,
        trigger_type,
        JSON.stringify(threshold),
        action,
        webhook_url || null,
        enabled !== false ? 1 : 0
      ]);

      res.json({
        success: true,
        trigger_id: result.lastID
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /api/triggers/:id - Update trigger
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Build dynamic UPDATE query
      const fields = [];
      const params = [];

      if (updates.threshold) {
        fields.push('threshold = ?');
        params.push(JSON.stringify(updates.threshold));
      }
      if (updates.action) {
        fields.push('action = ?');
        params.push(updates.action);
      }
      if (updates.webhook_url !== undefined) {
        fields.push('webhook_url = ?');
        params.push(updates.webhook_url);
      }
      if (updates.enabled !== undefined) {
        fields.push('enabled = ?');
        params.push(updates.enabled ? 1 : 0);
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(id);

      await db.run(`
        UPDATE triggers SET ${fields.join(', ')} WHERE id = ?
      `, params);

      res.json({ success: true, trigger_id: parseInt(id) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/triggers/:id - Remove trigger
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      await db.run('DELETE FROM triggers WHERE id = ?', [id]);
      await db.run('DELETE FROM trigger_events WHERE trigger_id = ?', [id]);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/triggers/events - List trigger events
  router.get('/events', async (req, res) => {
    try {
      const { limit = 50, offset = 0, trigger_id } = req.query;

      let query = `
        SELECT 
          te.*,
          t.trigger_type,
          t.scope,
          t.action
        FROM trigger_events te
        JOIN triggers t ON te.trigger_id = t.id
        WHERE 1=1
      `;
      const params = [];

      if (trigger_id) {
        query += ' AND te.trigger_id = ?';
        params.push(trigger_id);
      }

      query += ' ORDER BY te.timestamp DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const events = await db.all(query, params);

      // Parse details JSON
      events.forEach(e => {
        e.details = JSON.parse(e.details);
      });

      // Get total count
      const total = await db.get(
        'SELECT COUNT(*) as count FROM trigger_events' + 
        (trigger_id ? ' WHERE trigger_id = ?' : ''),
        trigger_id ? [trigger_id] : []
      );

      res.json({
        events,
        total: total.count
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/triggers/events/:trigger_id - Events for specific trigger
  router.get('/events/:trigger_id', async (req, res) => {
    try {
      const { trigger_id } = req.params;

      const trigger = await db.get('SELECT * FROM triggers WHERE id = ?', [trigger_id]);
      if (!trigger) {
        return res.status(404).json({ error: 'Trigger not found' });
      }

      const events = await db.all(`
        SELECT * FROM trigger_events
        WHERE trigger_id = ?
        ORDER BY timestamp DESC
      `, [trigger_id]);

      events.forEach(e => {
        e.details = JSON.parse(e.details);
      });

      trigger.threshold = JSON.parse(trigger.threshold);

      res.json({
        trigger,
        events
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/triggers/resume/:entity_type/:entity_id - Resume paused entity
  router.post('/resume/:entity_type/:entity_id', async (req, res) => {
    try {
      const { entity_type, entity_id } = req.params;

      const decoded_id = decodeURIComponent(entity_id);

      // Check if paused
      const pause = await db.get(`
        SELECT * FROM pause_states
        WHERE entity_type = ? AND entity_id = ?
      `, [entity_type, decoded_id]);

      if (!pause) {
        return res.status(404).json({
          error: 'Entity not paused',
          entity_type,
          entity_id: decoded_id
        });
      }

      // Remove pause
      await db.run(`
        DELETE FROM pause_states
        WHERE entity_type = ? AND entity_id = ?
      `, [entity_type, decoded_id]);

      // Log resume event
      if (pause.paused_by_trigger_id) {
        const trigger = await db.get(
          'SELECT trigger_id FROM trigger_events WHERE id = ?',
          [pause.paused_by_trigger_id]
        );

        if (trigger) {
          await db.run(`
            INSERT INTO trigger_events (trigger_id, entity_type, entity_id, details, action_taken)
            VALUES (?, ?, ?, ?, ?)
          `, [
            trigger.trigger_id,
            entity_type,
            decoded_id,
            JSON.stringify({ resumed_at: new Date().toISOString() }),
            'resumed'
          ]);
        }
      }

      // Emit WebSocket event
      wsServer.emit('entity_resumed', {
        entity_type,
        entity_id: decoded_id,
        resumed_at: new Date().toISOString()
      });

      res.json({
        success: true,
        entity_type,
        entity_id: decoded_id,
        resumed_at: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/triggers/status - Current pause status
  router.get('/status', async (req, res) => {
    try {
      const paused = await db.all(`
        SELECT 
          ps.*,
          te.details,
          t.trigger_type
        FROM pause_states ps
        LEFT JOIN trigger_events te ON ps.paused_by_trigger_id = te.id
        LEFT JOIN triggers t ON te.trigger_id = t.id
      `);

      paused.forEach(p => {
        if (p.details) {
          p.details = JSON.parse(p.details);
        }
      });

      res.json({ paused });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

// Validation helper
function validateThreshold(triggerType, threshold) {
  const required = {
    'rate_spike': ['multiplier', 'window_minutes'],
    'cost_spike': ['multiplier', 'window_minutes'],
    'error_storm': ['threshold_percent', 'min_sample_size', 'window_minutes'],
    'token_explosion': ['multiplier'],
    'silent_drain': [],
    'new_provider': []
  };

  const fields = required[triggerType];
  if (!fields) {
    return `Invalid trigger type: ${triggerType}`;
  }

  for (const field of fields) {
    if (threshold[field] === undefined) {
      return `Missing required threshold field: ${field} for trigger type ${triggerType}`;
    }
  }

  return null;
}

module.exports = createTriggersRouter;
```

---

## Component 5: Report Generation Engine

### Architecture

**Location:** `src/reports/`

### Components

#### 5.1 Generator (`generator.js`)

```javascript
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
```

#### 5.2 Scheduler (`scheduler.js`)

```javascript
const cron = require('node-cron');

class ReportScheduler {
  constructor(db, generator) {
    this.db = db;
    this.generator = generator;
    this.jobs = [];
  }

  start(config = {}) {
    const { 
      auto_generate = true,
      daily = '0 0 * * *',        // Midnight
      weekly = '0 0 * * 1',       // Monday midnight
      monthly = '0 0 1 * *'       // 1st of month
    } = config;

    if (!auto_generate) return;

    // Daily report
    this.jobs.push(
      cron.schedule(daily, () => this.generateDaily())
    );

    // Weekly report
    this.jobs.push(
      cron.schedule(weekly, () => this.generateWeekly())
    );

    // Monthly report
    this.jobs.push(
      cron.schedule(monthly, () => this.generateMonthly())
    );

    console.log('Report scheduler started');
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
  }

  async generateDaily() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const startDate = yesterday.toISOString();
      const endDate = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { html, json, report } = await this.generator.generateReport('daily', startDate, endDate);
      await this.generator.saveReport(report, html, json);

      console.log(`Daily report generated for ${yesterday.toDateString()}`);
    } catch (error) {
      console.error('Failed to generate daily report:', error);
    }
  }

  async generateWeekly() {
    try {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);

      const startDate = lastWeek.toISOString();
      const endDate = new Date(lastWeek.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { html, json, report } = await this.generator.generateReport('weekly', startDate, endDate);
      await this.generator.saveReport(report, html, json);

      console.log(`Weekly report generated`);
    } catch (error) {
      console.error('Failed to generate weekly report:', error);
    }
  }

  async generateMonthly() {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);

      const startDate = lastMonth.toISOString();
      const nextMonth = new Date(lastMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endDate = nextMonth.toISOString();

      const { html, json, report } = await this.generator.generateReport('monthly', startDate, endDate);
      await this.generator.saveReport(report, html, json);

      console.log(`Monthly report generated`);
    } catch (error) {
      console.error('Failed to generate monthly report:', error);
    }
  }
}

module.exports = ReportScheduler;
```

#### 5.3 Templates

**Main Template** (`templates/report.hbs`):
```handlebars
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ToastyKey Report - {{period}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Fira Sans', -apple-system, system-ui, sans-serif;
      background: #0F172A;
      color: #F8FAFC;
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .card {
      background: #1B2336;
      border: 1px solid #475569;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #22C55E; }
    h2 { font-size: 1.5rem; margin-bottom: 1rem; color: #F8FAFC; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .stat { background: #272F42; padding: 1rem; border-radius: 6px; }
    .stat-label { color: #94A3B8; font-size: 0.875rem; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: #F8FAFC; margin-top: 0.5rem; }
    .trend { display: inline-block; margin-left: 0.5rem; }
    .trend.up { color: #22C55E; }
    .trend.down { color: #EF4444; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #475569; }
    th { color: #94A3B8; font-weight: 600; }
    .badge { 
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .badge-warning { background: #F59E0B; color: #000; }
    .badge-suggestion { background: #3B82F6; color: #fff; }
    .recommendation { 
      padding: 1rem;
      margin-bottom: 0.75rem;
      border-left: 3px solid;
      background: #272F42;
    }
    .recommendation.warning { border-color: #F59E0B; }
    .recommendation.suggestion { border-color: #3B82F6; }
  </style>
</head>
<body>
  <div class="container">
    {{> header}}
    {{> summary}}
    {{> breakdown}}
    {{> trends}}
    {{> anomalies}}
    {{> recommendations}}
  </div>
</body>
</html>
```

**Partials** (examples in `templates/partials/`):

`header.hbs`:
```handlebars
<div class="card">
  <h1>🔥 ToastyKey Usage Report</h1>
  <p style="color: #94A3B8;">{{type}} Report - {{period}}</p>
  <p style="color: #64748B; font-size: 0.875rem; margin-top: 0.5rem;">
    Generated: {{generated_at}}
  </p>
</div>
```

`summary.hbs`:
```handlebars
<div class="card">
  <h2>Summary</h2>
  <div class="summary">
    <div class="stat">
      <div class="stat-label">Total Spend (USD)</div>
      <div class="stat-value">{{formatCurrency summary.total_usd 'USD'}}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total Spend (INR)</div>
      <div class="stat-value">{{formatCurrency summary.total_inr 'INR'}}</div>
    </div>
    <div class="stat">
      <div class="stat-label">API Calls</div>
      <div class="stat-value">{{summary.total_calls}}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Providers</div>
      <div class="stat-value">{{summary.provider_count}}</div>
    </div>
  </div>
</div>
```

`recommendations.hbs`:
```handlebars
<div class="card">
  <h2>Recommendations</h2>
  {{#if recommendations}}
    {{#each recommendations}}
      <div class="recommendation {{type}}">
        <span class="badge badge-{{type}}">{{category}}</span>
        <p style="margin-top: 0.5rem;">{{message}}</p>
      </div>
    {{/each}}
  {{else}}
    <p style="color: #94A3B8;">No recommendations at this time. Great job!</p>
  {{/if}}
</div>
```

#### 5.4 REST API (`src/proxy/api/reports.js`)

```javascript
const express = require('express');
const router = express.Router();

function createReportsRouter(db, generator) {
  // GET /api/reports - List all reports
  router.get('/', async (req, res) => {
    try {
      const { type, limit = 10, offset = 0 } = req.query;

      let query = 'SELECT id, period, generated_at FROM reports WHERE 1=1';
      const params = [];

      if (type) {
        query += ' AND period LIKE ?';
        params.push(`%${type}%`);
      }

      query += ' ORDER BY generated_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const reports = await db.all(query, params);

      const total = await db.get('SELECT COUNT(*) as count FROM reports');

      res.json({
        reports,
        total: total.count
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/reports/generate - Generate on demand
  router.post('/generate', async (req, res) => {
    try {
      const { type, start_date, end_date } = req.body;

      if (!type || !start_date || !end_date) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['type', 'start_date', 'end_date']
        });
      }

      const { html, json, report } = await generator.generateReport(type, start_date, end_date);
      const saved = await generator.saveReport(report, html, json);

      res.json({
        success: true,
        report_id: saved.report_id,
        html_path: saved.html_path
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/reports/:id - Get specific report
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const report = await db.get('SELECT * FROM reports WHERE id = ?', [id]);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Parse JSON
      report.summary_json = JSON.parse(report.summary_json);

      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/reports/:id - Delete report
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      await db.run('DELETE FROM reports WHERE id = ?', [id]);

      // TODO: Also delete HTML file from disk

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createReportsRouter;
```

---

## Component 6: Additional Providers

### Base Handler (`src/proxy/handlers/base.js`)

```javascript
const axios = require('axios');

class BaseHandler {
  constructor(provider, baseUrl, vault, pricing) {
    this.provider = provider;
    this.baseUrl = baseUrl;
    this.vault = vault;
    this.pricing = pricing;
  }

  // Override in subclasses
  async getApiKey(label = 'default') {
    return await this.vault.getKey(this.provider, label);
  }

  // Override in subclasses
  buildHeaders(apiKey, req) {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Override in subclasses
  extractModel(req, responseData) {
    return req.body?.model || 'unknown';
  }

  // Override in subclasses
  calculateCost(model, requestData, responseData) {
    return { usd: 0, inr: 0 };
  }

  extractPath(req) {
    // Extract path after /{provider}/
    const parts = req.path.split('/');
    parts.shift(); // Remove empty string from leading /
    parts.shift(); // Remove provider name
    return '/' + parts.join('/');
  }

  async handle(req, res, db, wsServer) {
    const startTime = Date.now();

    try {
      // 1. Get API key
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return res.status(500).json({
          error: `${this.provider} API key not configured`
        });
      }

      // 2. Extract path
      const apiPath = this.extractPath(req);

      // 3. Build headers
      const headers = this.buildHeaders(apiKey, req);

      // 4. Forward request
      const fullUrl = `${this.baseUrl}${apiPath}`;
      const response = await axios({
        method: req.method,
        url: fullUrl,
        headers: headers,
        data: req.body,
        params: req.query,
        validateStatus: () => true
      });

      // 5. Calculate latency
      const latency = Date.now() - startTime;

      // 6. Extract model
      const model = this.extractModel(req, response.data);

      // 7. Calculate cost
      const cost = this.calculateCost(model, req.body, response.data);

      // 8. Log to database
      await db.logApiCall({
        provider: this.provider,
        endpoint: apiPath,
        project: req.toastykey?.project || null,
        session_id: req.toastykey?.session_id || null,
        model: model,
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: cost.usd,
        cost_inr: cost.inr,
        status: response.status,
        latency_ms: latency,
        request_data: JSON.stringify({
          method: req.method,
          path: apiPath,
          body: req.body
        }),
        response_data: JSON.stringify({
          status: response.status,
          data: response.data
        })
      });

      // 9. Emit WebSocket
      if (wsServer) {
        wsServer.emitApiCall({
          provider: this.provider,
          endpoint: apiPath,
          model,
          cost_inr: cost.inr,
          cost_usd: cost.usd,
          status: response.status,
          latency_ms: latency,
          timestamp: new Date().toISOString(),
          project: req.toastykey?.project || null
        });
      }

      // 10. Return response
      return res.status(response.status).json(response.data);

    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`${this.provider} handler error:`, error.message);

      // Log failure
      try {
        await db.logApiCall({
          provider: this.provider,
          endpoint: this.extractPath(req),
          project: req.toastykey?.project || null,
          session_id: req.toastykey?.session_id || null,
          model: 'unknown',
          input_tokens: 0,
          output_tokens: 0,
          cost_usd: 0,
          cost_inr: 0,
          status: 500,
          latency_ms: latency,
          request_data: JSON.stringify({ error: error.message }),
          response_data: JSON.stringify({ error: error.message })
        });
      } catch (dbError) {
        console.error('Failed to log error:', dbError.message);
      }

      return res.status(500).json({
        error: {
          type: 'proxy_error',
          message: 'Internal proxy error'
        }
      });
    }
  }
}

module.exports = BaseHandler;
```

### Provider-Specific Handlers

**ElevenLabs** (`src/proxy/handlers/elevenlabs.js`):
```javascript
const BaseHandler = require('./base');

class ElevenLabsHandler extends BaseHandler {
  constructor(vault, pricing) {
    super('elevenlabs', 'https://api.elevenlabs.io', vault, pricing);
  }

  buildHeaders(apiKey, req) {
    return {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    };
  }

  extractModel(req, responseData) {
    return req.body?.model_id || 'eleven_multilingual_v2';
  }

  calculateCost(model, requestData, responseData) {
    const text = requestData?.text || '';
    const characters = text.length;

    const priceData = this.pricing.getPrice('elevenlabs', model);
    if (!priceData) {
      return { usd: 0, inr: 0 };
    }

    const costUsd = (characters / 1000) * priceData.price;
    const costInr = costUsd * 83.5; // USD to INR

    return { usd: costUsd, inr: costInr };
  }
}

module.exports = ElevenLabsHandler;
```

**Cartesia** (`src/proxy/handlers/cartesia.js`):
```javascript
const BaseHandler = require('./base');

class CartesiaHandler extends BaseHandler {
  constructor(vault, pricing) {
    super('cartesia', 'https://api.cartesia.ai', vault, pricing);
  }

  buildHeaders(apiKey, req) {
    return {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    };
  }

  extractModel(req, responseData) {
    return req.body?.model || 'sonic-2';
  }

  calculateCost(model, requestData, responseData) {
    const text = requestData?.transcript || '';
    const characters = text.length;

    const priceData = this.pricing.getPrice('cartesia', model);
    if (!priceData) {
      return { usd: 0, inr: 0 };
    }

    const costUsd = (characters / 1000) * priceData.price;
    const costInr = costUsd * 83.5;

    return { usd: costUsd, inr: costInr };
  }
}

module.exports = CartesiaHandler;
```

**Replicate** (`src/proxy/handlers/replicate.js`):
```javascript
const BaseHandler = require('./base');

class ReplicateHandler extends BaseHandler {
  constructor(vault, pricing) {
    super('replicate', 'https://api.replicate.com', vault, pricing);
  }

  extractModel(req, responseData) {
    // Extract from version string like "stability-ai/sdxl:..."
    const version = req.body?.version || '';
    const parts = version.split('/');
    return parts[1]?.split(':')[0] || 'unknown';
  }

  calculateCost(model, requestData, responseData) {
    // Cost based on compute time from response
    const predictTime = responseData?.metrics?.predict_time || 0;

    const priceData = this.pricing.getPrice('replicate', model);
    if (!priceData) {
      // Default: $0.0023 per second
      const costUsd = predictTime * 0.0023;
      return { usd: costUsd, inr: costUsd * 83.5 };
    }

    const costUsd = predictTime * priceData.price;
    const costInr = costUsd * 83.5;

    return { usd: costUsd, inr: costInr };
  }
}

module.exports = ReplicateHandler;
```

**Stability AI** (`src/proxy/handlers/stability.js`):
```javascript
const BaseHandler = require('./base');

class StabilityHandler extends BaseHandler {
  constructor(vault, pricing) {
    super('stability', 'https://api.stability.ai', vault, pricing);
  }

  extractModel(req, responseData) {
    // Extract from path like /v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image
    const pathParts = req.path.split('/');
    return pathParts[3] || 'stable-diffusion-xl';
  }

  calculateCost(model, requestData, responseData) {
    // Cost per image generated
    const images = responseData?.artifacts?.length || 1;

    const priceData = this.pricing.getPrice('stability', model);
    if (!priceData) {
      return { usd: 0, inr: 0 };
    }

    const costUsd = images * priceData.price;
    const costInr = costUsd * 83.5;

    return { usd: costUsd, inr: costInr };
  }
}

module.exports = StabilityHandler;
```

**Generic REST** (`src/proxy/handlers/generic.js`):
```javascript
const BaseHandler = require('./base');

class GenericHandler extends BaseHandler {
  constructor(providerConfig, vault, pricing) {
    super(
      providerConfig.name,
      providerConfig.base_url,
      vault,
      pricing
    );
    this.config = providerConfig;
  }

  buildHeaders(apiKey, req) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.config.auth_method === 'bearer') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (this.config.auth_method === 'api_key' && this.config.auth_header) {
      headers[this.config.auth_header] = apiKey;
    }

    return headers;
  }

  calculateCost(model, requestData, responseData) {
    // Flat rate per request
    const costUsd = this.config.cost_per_request || 0;
    const costInr = costUsd * 83.5;

    return { usd: costUsd, inr: costInr };
  }
}

module.exports = GenericHandler;
```

### Pricing JSON Files

**ElevenLabs** (`pricing/elevenlabs.json`):
```json
{
  "provider": "elevenlabs",
  "updated": "2026-04-05",
  "models": {
    "eleven_multilingual_v2": {
      "price": 0.30,
      "unit": "1k_characters"
    },
    "eleven_turbo_v2": {
      "price": 0.20,
      "unit": "1k_characters"
    }
  }
}
```

**Cartesia** (`pricing/cartesia.json`):
```json
{
  "provider": "cartesia",
  "updated": "2026-04-05",
  "models": {
    "sonic-2": {
      "price": 0.15,
      "unit": "1k_characters"
    }
  }
}
```

**Replicate** (`pricing/replicate.json`):
```json
{
  "provider": "replicate",
  "updated": "2026-04-05",
  "models": {
    "flux": {
      "price": 0.0023,
      "unit": "per_second"
    },
    "sdxl": {
      "price": 0.0023,
      "unit": "per_second"
    },
    "default": {
      "price": 0.0023,
      "unit": "per_second"
    }
  }
}
```

**Stability AI** (`pricing/stability.json`):
```json
{
  "provider": "stability",
  "updated": "2026-04-05",
  "models": {
    "stable-diffusion-xl": {
      "price": 0.04,
      "unit": "per_image"
    },
    "sd3": {
      "price": 0.065,
      "unit": "per_image"
    }
  }
}
```

### Provider Registration (`src/proxy/index.js`)

```javascript
// Import handlers
const BaseHandler = require('./handlers/base');
const ElevenLabsHandler = require('./handlers/elevenlabs');
const CartesiaHandler = require('./handlers/cartesia');
const ReplicateHandler = require('./handlers/replicate');
const StabilityHandler = require('./handlers/stability');
const GenericHandler = require('./handlers/generic');

// Initialize handlers
setupRoutes() {
  // ... existing routes ...

  // New provider handlers
  const elevenLabs = new ElevenLabsHandler(this.vault, this.pricing);
  const cartesia = new CartesiaHandler(this.vault, this.pricing);
  const replicate = new ReplicateHandler(this.vault, this.pricing);
  const stability = new StabilityHandler(this.vault, this.pricing);

  // Register routes
  this.app.all('/elevenlabs/*', (req, res) => 
    elevenLabs.handle(req, res, this.db, this.wsServer)
  );

  this.app.all('/cartesia/*', (req, res) => 
    cartesia.handle(req, res, this.db, this.wsServer)
  );

  this.app.all('/replicate/*', (req, res) => 
    replicate.handle(req, res, this.db, this.wsServer)
  );

  this.app.all('/stability/*', (req, res) => 
    stability.handle(req, res, this.db, this.wsServer)
  );

  // Generic/custom providers
  this.app.all('/custom/:provider/*', async (req, res) => {
    const providerName = req.params.provider;
    const config = await this.db.get(
      'SELECT * FROM custom_providers WHERE name = ?',
      [providerName]
    );

    if (!config) {
      return res.status(404).json({
        error: `Custom provider '${providerName}' not configured`
      });
    }

    const handler = new GenericHandler(config, this.vault, this.pricing);
    await handler.handle(req, res, this.db, this.wsServer);
  });
}
```

---

## Component 7: Budget Enforcement Upgrade

### Enhanced Middleware (`src/proxy/middleware.js`)

```javascript
function checkBudgets(db, wsServer) {
  return async (req, res, next) => {
    try {
      // Get applicable budgets (global, provider, project)
      const budgets = await getApplicableBudgets(db, req);

      for (const budget of budgets) {
        const currentSpend = await getCurrentSpend(db, budget);
        const percentage = (currentSpend / budget.limit_amount) * 100;

        // Emit warning at notify_at_percent (default 80%)
        if (percentage >= budget.notify_at_percent && percentage < 100) {
          // Check if warning already sent recently (avoid spam)
          const lastWarning = await db.get(`
            SELECT timestamp FROM trigger_events
            WHERE entity_type = 'budget'
            AND entity_id = ?
            AND action_taken = 'budget_warning'
            AND timestamp >= datetime('now', '-1 hour')
            ORDER BY timestamp DESC LIMIT 1
          `, [budget.id]);

          if (!lastWarning) {
            wsServer.emit('budget_warning', {
              budget_id: budget.id,
              scope: budget.scope,
              period: budget.period,
              percentage: Math.round(percentage),
              current: currentSpend,
              limit: budget.limit_amount
            });

            // Log warning event
            await db.run(`
              INSERT INTO trigger_events (trigger_id, entity_type, entity_id, details, action_taken)
              VALUES (0, 'budget', ?, ?, 'budget_warning')
            `, [budget.id, JSON.stringify({ percentage, current: currentSpend, limit: budget.limit_amount })]);
          }
        }

        // BLOCK at 100% if enforce=1
        if (budget.enforce && currentSpend >= budget.limit_amount) {
          wsServer.emit('budget_exceeded', {
            budget_id: budget.id,
            scope: budget.scope,
            period: budget.period,
            current: currentSpend,
            limit: budget.limit_amount
          });

          return res.status(429).json({
            error: 'Budget limit exceeded',
            budget: {
              id: budget.id,
              scope: budget.scope,
              period: budget.period,
              limit: budget.limit_amount,
              spent: currentSpend,
              percentage: Math.round(percentage)
            },
            message: `${budget.scope} ${budget.period} budget of ${formatCurrency(budget.limit_amount)} has been reached.`,
            override_endpoint: `POST /api/budgets/override/${budget.id}`
          });
        }
      }

      next();
    } catch (error) {
      console.error('Budget check error:', error);
      next(); // Don't block on budget check errors
    }
  };
}

async function getApplicableBudgets(db, req) {
  const budgets = [];

  // Global budgets
  const global = await db.all(`
    SELECT * FROM budgets
    WHERE scope = 'global'
  `);
  budgets.push(...global);

  // Provider-specific budgets
  if (req.toastykey?.provider) {
    const provider = await db.all(`
      SELECT * FROM budgets
      WHERE scope = 'provider' AND scope_id = ?
    `, [req.toastykey.provider]);
    budgets.push(...provider);
  }

  // Project-specific budgets
  if (req.toastykey?.project) {
    const project = await db.all(`
      SELECT * FROM budgets
      WHERE scope = 'project' AND scope_id = ?
    `, [req.toastykey.project]);
    budgets.push(...project);
  }

  return budgets;
}

async function getCurrentSpend(db, budget) {
  let query = '';
  let params = [];

  if (budget.period === 'day') {
    query = `
      SELECT SUM(cost_inr) as spend FROM api_calls
      WHERE timestamp >= datetime('now', 'start of day')
    `;
  } else if (budget.period === 'week') {
    query = `
      SELECT SUM(cost_inr) as spend FROM api_calls
      WHERE timestamp >= datetime('now', '-6 days', 'start of day')
    `;
  } else if (budget.period === 'month') {
    query = `
      SELECT SUM(cost_inr) as spend FROM api_calls
      WHERE timestamp >= datetime('now', 'start of month')
    `;
  }

  // Add scope filters
  if (budget.scope === 'provider') {
    query += ' AND provider = ?';
    params.push(budget.scope_id);
  } else if (budget.scope === 'project') {
    query += ' AND project = ?';
    params.push(budget.scope_id);
  }

  const result = await db.get(query, params);
  return result.spend || 0;
}
```

### Budget Override API (`src/proxy/api/budgets.js`)

```javascript
// Add to existing budgets router

// POST /api/budgets/override/:id - Temporarily increase budget
router.post('/override/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { additional_amount, reason } = req.body;

    if (!additional_amount || additional_amount <= 0) {
      return res.status(400).json({
        error: 'additional_amount must be positive'
      });
    }

    // Get current budget
    const budget = await db.get('SELECT * FROM budgets WHERE id = ?', [id]);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Calculate expiry (end of current period)
    let expiresAt;
    if (budget.period === 'day') {
      expiresAt = new Date();
      expiresAt.setHours(23, 59, 59, 999);
    } else if (budget.period === 'week') {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (7 - expiresAt.getDay()));
      expiresAt.setHours(23, 59, 59, 999);
    } else if (budget.period === 'month') {
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1, 0);
      expiresAt.setHours(23, 59, 59, 999);
    }

    // Create override
    const override = await db.run(`
      INSERT INTO budget_overrides (budget_id, additional_amount, reason, expires_at)
      VALUES (?, ?, ?, ?)
    `, [id, additional_amount, reason || 'Manual override', expiresAt.toISOString()]);

    // Update budget limit
    await db.run(`
      UPDATE budgets
      SET limit_amount = limit_amount + ?
      WHERE id = ?
    `, [additional_amount, id]);

    res.json({
      success: true,
      override_id: override.lastID,
      new_limit: budget.limit_amount + additional_amount,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Budget Reset Scheduler

```javascript
// Add to src/proxy/index.js

const cron = require('node-cron');

class ProxyServer {
  // ... existing code ...

  setupBudgetReset() {
    // Reset daily budgets at midnight
    cron.schedule('0 0 * * *', async () => {
      await this.db.run(`
        UPDATE budgets
        SET current_spend = 0
        WHERE period = 'day'
      `);
      console.log('Daily budgets reset');
    });

    // Reset weekly budgets on Monday midnight
    cron.schedule('0 0 * * 1', async () => {
      await this.db.run(`
        UPDATE budgets
        SET current_spend = 0
        WHERE period = 'week'
      `);
      console.log('Weekly budgets reset');
    });

    // Reset monthly budgets on 1st of month
    cron.schedule('0 0 1 * *', async () => {
      await this.db.run(`
        UPDATE budgets
        SET current_spend = 0
        WHERE period = 'month'
      `);

      // Clean expired overrides
      await this.db.run(`
        DELETE FROM budget_overrides
        WHERE expires_at < datetime('now')
      `);

      console.log('Monthly budgets reset');
    });
  }

  start() {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`Proxy + WebSocket running on http://localhost:${this.port}`);
        
        // Start budget reset scheduler
        this.setupBudgetReset();
        
        resolve();
      });
    });
  }
}
```

---

## Component 8: MCP Tools

### New Tools (`src/mcp/tools.js`)

Add 6 new tools to existing array:

```javascript
const TOOLS = [
  // ... existing 7 tools ...

  {
    name: 'get_anomaly_log',
    description: 'Get recent anomaly detection events (trigger fires). Returns list of detected anomalies with details, timestamps, and actions taken.',
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
    description: 'Get detailed statistics for a specific provider (calls, cost, latency, error rate, top models). Useful for analyzing provider performance and costs.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Provider name (e.g., "openai", "anthropic", "elevenlabs")'
        },
        period: {
          type: 'string',
          enum: ['today', 'week', 'month'],
          description: 'Time period for statistics',
          default: 'week'
        }
      },
      required: ['provider']
    }
  },

  {
    name: 'get_cost_breakdown',
    description: 'Get hierarchical cost breakdown by provider and project for a specified time range. Returns detailed breakdown with percentages.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date (ISO 8601 format: YYYY-MM-DD)'
        },
        end_date: {
          type: 'string',
          description: 'End date (ISO 8601 format: YYYY-MM-DD)'
        }
      },
      required: ['start_date', 'end_date']
    }
  },

  {
    name: 'pause_provider',
    description: 'Manually pause all API calls to a specific provider. Useful for troubleshooting, cost control, or switching providers.',
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
          default: 'Manual pause'
        }
      },
      required: ['provider']
    }
  },

  {
    name: 'resume_provider',
    description: 'Resume a paused provider. Removes the pause state and allows API calls to proceed.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Provider name to resume'
        }
      },
      required: ['provider']
    }
  },

  {
    name: 'get_recommendations',
    description: 'Get cost-saving recommendations based on usage patterns. Identifies unused keys, suggests cheaper models, flags high-error providers.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['week', 'month'],
          description: 'Analysis period',
          default: 'week'
        }
      },
      required: []
    }
  }
];
```

### Tool Handlers (`src/mcp/index.js`)

Add handlers for new tools:

```javascript
async function handleToolCall(name, args, db, vault, pricing) {
  // ... existing handlers ...

  // NEW HANDLERS

  if (name === 'get_anomaly_log') {
    const { limit = 10, trigger_type } = args;

    let query = `
      SELECT 
        te.*,
        t.trigger_type,
        t.scope,
        t.action
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

    const events = await db.all(query, params);

    events.forEach(e => {
      e.details = JSON.parse(e.details);
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          anomalies: events,
          count: events.length,
          message: events.length === 0 
            ? 'No anomalies detected recently. All systems normal.' 
            : `Found ${events.length} anomaly event(s).`
        }, null, 2)
      }]
    };
  }

  if (name === 'get_provider_stats') {
    const { provider, period = 'week' } = args;

    let timeFilter = '';
    if (period === 'today') {
      timeFilter = `timestamp >= datetime('now', 'start of day')`;
    } else if (period === 'week') {
      timeFilter = `timestamp >= datetime('now', '-7 days')`;
    } else if (period === 'month') {
      timeFilter = `timestamp >= datetime('now', 'start of month')`;
    }

    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_calls,
        SUM(cost_usd) as total_cost_usd,
        SUM(cost_inr) as total_cost_inr,
        AVG(latency_ms) as avg_latency,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count,
        ROUND(SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as error_rate
      FROM api_calls
      WHERE provider = ? AND ${timeFilter}
    `, [provider]);

    const topModels = await db.all(`
      SELECT 
        model,
        COUNT(*) as calls,
        SUM(cost_usd) as cost
      FROM api_calls
      WHERE provider = ? AND ${timeFilter}
      GROUP BY model
      ORDER BY cost DESC
      LIMIT 5
    `, [provider]);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          provider,
          period,
          stats,
          top_models: topModels
        }, null, 2)
      }]
    };
  }

  if (name === 'get_cost_breakdown') {
    const { start_date, end_date } = args;

    const providers = await db.all(`
      SELECT 
        provider,
        SUM(cost_usd) as cost_usd,
        SUM(cost_inr) as cost_inr,
        COUNT(*) as calls,
        ROUND(SUM(cost_usd) * 100.0 / (SELECT SUM(cost_usd) FROM api_calls WHERE timestamp BETWEEN ? AND ?), 2) as percentage
      FROM api_calls
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY provider
      ORDER BY cost_usd DESC
    `, [start_date, end_date, start_date, end_date]);

    const projects = await db.all(`
      SELECT 
        project,
        SUM(cost_usd) as cost_usd,
        SUM(cost_inr) as cost_inr,
        COUNT(*) as calls,
        ROUND(SUM(cost_usd) * 100.0 / (SELECT SUM(cost_usd) FROM api_calls WHERE timestamp BETWEEN ? AND ?), 2) as percentage
      FROM api_calls
      WHERE timestamp BETWEEN ? AND ?
      AND project IS NOT NULL
      GROUP BY project
      ORDER BY cost_usd DESC
    `, [start_date, end_date, start_date, end_date]);

    const total = await db.get(`
      SELECT SUM(cost_usd) as total_usd, SUM(cost_inr) as total_inr
      FROM api_calls
      WHERE timestamp BETWEEN ? AND ?
    `, [start_date, end_date]);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          period: { start: start_date, end: end_date },
          total,
          by_provider: providers,
          by_project: projects
        }, null, 2)
      }]
    };
  }

  if (name === 'pause_provider') {
    const { provider, reason = 'Manual pause via Claude Code' } = args;

    // Check if already paused
    const existing = await db.get(`
      SELECT * FROM pause_states
      WHERE entity_type = 'provider' AND entity_id = ?
    `, [provider]);

    if (existing) {
      return {
        content: [{
          type: 'text',
          text: `Provider '${provider}' is already paused since ${existing.paused_at}.`
        }]
      };
    }

    // Insert pause state
    await db.run(`
      INSERT INTO pause_states (entity_type, entity_id, reason)
      VALUES ('provider', ?, ?)
    `, [provider, reason]);

    return {
      content: [{
        type: 'text',
        text: `Provider '${provider}' has been paused. All API calls to ${provider} will be blocked with a 429 error. Use resume_provider to unblock.`
      }]
    };
  }

  if (name === 'resume_provider') {
    const { provider } = args;

    const result = await db.run(`
      DELETE FROM pause_states
      WHERE entity_type = 'provider' AND entity_id = ?
    `, [provider]);

    if (result.changes === 0) {
      return {
        content: [{
          type: 'text',
          text: `Provider '${provider}' was not paused.`
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: `Provider '${provider}' has been resumed. API calls will now proceed normally.`
      }]
    };
  }

  if (name === 'get_recommendations') {
    const { period = 'week' } = args;

    const recommendations = [];

    // 1. Unused keys
    const unusedKeys = await db.all(`
      SELECT provider, label, created_at, last_used
      FROM api_keys
      WHERE last_used IS NULL OR last_used < datetime('now', '-30 days')
    `);

    unusedKeys.forEach(key => {
      const daysSince = key.last_used 
        ? Math.floor((Date.now() - new Date(key.last_used)) / (1000 * 60 * 60 * 24))
        : 'never';
      recommendations.push({
        type: 'unused_key',
        severity: 'warning',
        message: `Key "${key.label}" (${key.provider}) has not been used in ${daysSince === 'never' ? 'never' : daysSince + ' days'}. Consider removing it for security.`
      });
    });

    // 2. High error rates
    const timeFilter = period === 'week' 
      ? `timestamp >= datetime('now', '-7 days')`
      : `timestamp >= datetime('now', 'start of month')`;

    const errorRates = await db.all(`
      SELECT 
        provider,
        COUNT(*) as total,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors,
        ROUND(SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as error_rate
      FROM api_calls
      WHERE ${timeFilter}
      GROUP BY provider
      HAVING error_rate > 10
    `);

    errorRates.forEach(p => {
      recommendations.push({
        type: 'high_error_rate',
        severity: 'warning',
        provider: p.provider,
        message: `${p.provider} has ${p.error_rate}% error rate (${p.errors}/${p.total} calls). Check API key validity and request formats.`
      });
    });

    // 3. Cheaper model suggestions
    const expensiveModels = await db.all(`
      SELECT 
        provider,
        model,
        COUNT(*) as calls,
        SUM(cost_usd) as cost
      FROM api_calls
      WHERE ${timeFilter}
      AND provider IN ('openai', 'anthropic')
      GROUP BY provider, model
      HAVING calls > 10
      ORDER BY cost DESC
    `);

    expensiveModels.forEach(m => {
      if (m.provider === 'openai' && m.model.includes('gpt-4') && !m.model.includes('mini')) {
        recommendations.push({
          type: 'cheaper_model',
          severity: 'suggestion',
          provider: m.provider,
          current_model: m.model,
          suggested_model: 'gpt-4o-mini',
          message: `You're using ${m.model} (${m.calls} calls, $${m.cost.toFixed(2)}). Consider gpt-4o-mini for simpler tasks - 70% cheaper with great quality.`,
          potential_savings: m.cost * 0.7
        });
      }
      if (m.provider === 'anthropic' && m.model.includes('opus')) {
        recommendations.push({
          type: 'cheaper_model',
          severity: 'suggestion',
          provider: m.provider,
          current_model: m.model,
          suggested_model: 'claude-sonnet-4',
          message: `You're using ${m.model} (${m.calls} calls, $${m.cost.toFixed(2)}). Consider claude-sonnet for most tasks - significantly cheaper.`,
          potential_savings: m.cost * 0.6
        });
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          period,
          recommendations,
          count: recommendations.length,
          summary: recommendations.length === 0 
            ? 'No recommendations at this time. Your usage looks efficient!' 
            : `Found ${recommendations.length} recommendation(s) for cost optimization.`
        }, null, 2)
      }]
    };
  }

  // ... rest of existing handlers ...
}
```

---

## Component 9: Testing Strategy

### Test Files Structure

```
tests/
├── unit/
│   ├── triggers/
│   │   ├── rate-spike.test.js
│   │   ├── cost-spike.test.js
│   │   ├── error-storm.test.js
│   │   ├── token-explosion.test.js
│   │   ├── silent-drain.test.js
│   │   └── new-provider.test.js
│   ├── baselines/
│   │   ├── calculator.test.js
│   │   └── storage.test.js
│   ├── handlers/
│   │   ├── base.test.js
│   │   ├── elevenlabs.test.js
│   │   ├── cartesia.test.js
│   │   ├── replicate.test.js
│   │   ├── stability.test.js
│   │   └── generic.test.js
│   └── reports/
│       └── generator.test.js
│
├── integration/
│   ├── anomaly-detection.test.js
│   ├── pause-resume.test.js
│   ├── budget-enforcement.test.js
│   └── report-generation.test.js
│
└── api/
    ├── triggers-api.test.js
    ├── reports-api.test.js
    └── mcp-tools.test.js
```

### Example Test: Rate Spike Detection

```javascript
// tests/unit/triggers/rate-spike.test.js

const { check } = require('../../../src/triggers/types/rate-spike');

describe('Rate Spike Trigger', () => {
  let mockDb;
  let mockBaselines;

  beforeEach(() => {
    mockDb = {
      get: jest.fn()
    };
    mockBaselines = {
      getRate: jest.fn()
    };
  });

  test('triggers when rate exceeds baseline × multiplier', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        multiplier: 5,
        window_minutes: 2,
        min_sample_size: 10
      })
    };

    // Mock current rate: 100 calls in 2 minutes = 50 calls/min
    mockDb.get.mockResolvedValue({ calls: 100 });

    // Mock baseline: 8 calls/min (normal)
    mockBaselines.getRate.mockResolvedValue({
      value: 8,
      sample_size: 100
    });

    const result = await check(mockDb, trigger, mockBaselines);

    expect(result.triggered).toBe(true);
    expect(result.metric_value).toBe(50);
    expect(result.baseline_value).toBe(8);
    expect(result.details.multiplier_exceeded).toBeCloseTo(6.25);
  });

  test('does not trigger when below threshold', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        multiplier: 5,
        window_minutes: 2,
        min_sample_size: 10
      })
    };

    // Mock current rate: 30 calls in 2 minutes = 15 calls/min
    mockDb.get.mockResolvedValue({ calls: 30 });

    // Mock baseline: 8 calls/min
    mockBaselines.getRate.mockResolvedValue({
      value: 8,
      sample_size: 100
    });

    const result = await check(mockDb, trigger, mockBaselines);

    expect(result.triggered).toBe(false);
  });

  test('returns null when insufficient baseline data', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        multiplier: 5,
        window_minutes: 2,
        min_sample_size: 50
      })
    };

    mockDb.get.mockResolvedValue({ calls: 100 });
    mockBaselines.getRate.mockResolvedValue({
      value: 8,
      sample_size: 10  // Below min_sample_size
    });

    const result = await check(mockDb, trigger, mockBaselines);

    expect(result).toBeNull();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/unit/triggers/

# Run with coverage
npm test -- --coverage

# Watch mode during development
npm test -- --watch
```

### Coverage Target

- **Unit tests**: >90% coverage for all trigger types, handlers, baseline calculator
- **Integration tests**: All major flows tested end-to-end
- **API tests**: All new endpoints tested

---

## Integration with Proxy

### Updated `src/proxy/index.js`

```javascript
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const WebSocketServer = require('./websocket');
const { detectProject, checkBudgets } = require('./middleware');

// NEW IMPORTS
const AnomalyDetector = require('../triggers/detector');
const BaselineCalculator = require('../baselines/calculator');
const BaselineStorage = require('../baselines/storage');
const ReportGenerator = require('../reports/generator');
const ReportScheduler = require('../reports/scheduler');

class ProxyServer {
  constructor(database, vault, pricing, port = 4000) {
    this.db = database;
    this.vault = vault;
    this.pricing = pricing;
    this.port = port;

    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.wsServer = new WebSocketServer(this.httpServer);

    // NEW: Initialize subsystems
    this.baselines = new BaselineStorage(this.db);
    this.baselineCalculator = new BaselineCalculator(this.db);
    this.anomalyDetector = new AnomalyDetector(this.db, this.wsServer, this.baselines);
    this.reportGenerator = new ReportGenerator(this.db);
    this.reportScheduler = new ReportScheduler(this.db, this.reportGenerator);

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(detectProject(this.db));
    this.app.use(checkPauseState(this.db));  // NEW: Check pause before budgets
    this.app.use(checkBudgets(this.db, this.wsServer));  // ENHANCED: Now enforces
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'toastykey-api',
        version: '0.3.0',
        uptime: process.uptime()
      });
    });

    // Existing API routes
    const createStatsRouter = require('./api/stats');
    this.app.use('/api/stats', createStatsRouter(this.db));

    const createProjectsRouter = require('./api/projects');
    this.app.use('/api/projects', createProjectsRouter(this.db));

    const createVaultRouter = require('./api/vault');
    this.app.use('/api/vault', createVaultRouter(this.db, this.vault, this.wsServer));

    const createBudgetsRouter = require('./api/budgets');
    this.app.use('/api/budgets', createBudgetsRouter(this.db));

    const createSetupRouter = require('./api/setup');
    this.app.use('/api/setup', createSetupRouter(this.db));

    // NEW: Triggers API
    const createTriggersRouter = require('./api/triggers');
    this.app.use('/api/triggers', createTriggersRouter(this.db, this.wsServer));

    // NEW: Reports API
    const createReportsRouter = require('./api/reports');
    this.app.use('/api/reports', createReportsRouter(this.db, this.reportGenerator));

    // ... existing provider handlers ...

    // NEW: Additional provider handlers
    this.setupNewProviders();

    // Serve dashboard in production
    if (process.env.NODE_ENV === 'production') {
      const dashboardPath = path.join(__dirname, '../dashboard/dist');
      this.app.use(express.static(dashboardPath));
      this.app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || 
            req.path.startsWith('/openai') || 
            req.path.startsWith('/anthropic') ||
            req.path.startsWith('/elevenlabs') ||
            req.path.startsWith('/cartesia') ||
            req.path.startsWith('/replicate') ||
            req.path.startsWith('/stability') ||
            req.path.startsWith('/custom') ||
            req.path === '/stats') {
          return next();
        }
        res.sendFile(path.join(dashboardPath, 'index.html'));
      });
    }
  }

  setupNewProviders() {
    const ElevenLabsHandler = require('./handlers/elevenlabs');
    const CartesiaHandler = require('./handlers/cartesia');
    const ReplicateHandler = require('./handlers/replicate');
    const StabilityHandler = require('./handlers/stability');
    const GenericHandler = require('./handlers/generic');

    const elevenLabs = new ElevenLabsHandler(this.vault, this.pricing);
    const cartesia = new CartesiaHandler(this.vault, this.pricing);
    const replicate = new ReplicateHandler(this.vault, this.pricing);
    const stability = new StabilityHandler(this.vault, this.pricing);

    this.app.all('/elevenlabs/*', (req, res) => 
      elevenLabs.handle(req, res, this.db, this.wsServer)
    );

    this.app.all('/cartesia/*', (req, res) => 
      cartesia.handle(req, res, this.db, this.wsServer)
    );

    this.app.all('/replicate/*', (req, res) => 
      replicate.handle(req, res, this.db, this.wsServer)
    );

    this.app.all('/stability/*', (req, res) => 
      stability.handle(req, res, this.db, this.wsServer)
    );

    // Generic/custom providers
    this.app.all('/custom/:provider/*', async (req, res) => {
      const providerName = req.params.provider;
      const config = await this.db.get(
        'SELECT * FROM custom_providers WHERE name = ?',
        [providerName]
      );

      if (!config) {
        return res.status(404).json({
          error: `Custom provider '${providerName}' not configured`
        });
      }

      const handler = new GenericHandler(config, this.vault, this.pricing);
      await handler.handle(req, res, this.db, this.wsServer);
    });
  }

  async start() {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, async () => {
        console.log(`Proxy + WebSocket running on http://localhost:${this.port}`);
        
        // NEW: Start subsystems
        await this.reportGenerator.initialize();
        this.baselineCalculator.start();
        this.anomalyDetector.start();
        this.reportScheduler.start();
        this.setupBudgetReset();
        
        resolve();
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      // Stop subsystems
      this.anomalyDetector.stop();
      this.baselineCalculator.stop();
      this.reportScheduler.stop();

      if (this.httpServer) {
        this.httpServer.close(resolve);
      } else {
        resolve();
      }
    });
  }
}

module.exports = ProxyServer;
```

---

## Configuration

### Config File (`src/config.js`)

Add new configuration options:

```javascript
module.exports = {
  // ... existing config ...

  // NEW: Anomaly detection
  anomaly_detection: {
    enabled: true,
    check_interval_seconds: 30,
    first_week_grace_period: true  // No alerts in first 7 days
  },

  // NEW: Reports
  reports: {
    auto_generate: true,
    schedules: {
      daily: '0 0 * * *',
      weekly: '0 0 * * 1',
      monthly: '0 0 1 * *'
    }
  },

  // NEW: Baselines
  baselines: {
    update_interval_hours: 1,
    lookback_days: 7
  },

  // NEW: Budget enforcement
  budgets: {
    enforce_by_default: false,
    warning_threshold_percent: 80
  }
};
```

---

## Git Workflow

### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/session3

# Work in small commits per component
git add src/triggers/
git commit -m "feat(triggers): add anomaly detection engine"

git add src/baselines/
git commit -m "feat(baselines): add baseline calculator"

# ... etc

# Tag when complete
git tag v0.3.0-session3

# Don't merge to main yet (Session 3B will do that after frontend integration)
```

### Commit Messages

Follow conventional commits:
- `feat(triggers): ...` - New feature
- `fix(budgets): ...` - Bug fix
- `test(triggers): ...` - Tests
- `docs(session3): ...` - Documentation

---

## Success Criteria

Session 3A is complete when:

1. ✅ All 9 components implemented and working
2. ✅ All existing tests still pass
3. ✅ New test coverage >85%
4. ✅ All API endpoints documented and tested
5. ✅ No regressions in existing features
6. ✅ Code committed to `feature/session3` branch
7. ✅ Tagged as `v0.3.0-session3`
8. ✅ Ready for Session 3B frontend integration

---

## Session 3B Preview

Next session (on desktop) will:
- Update Triggers view with real data
- Update Reports view with generated reports
- Add anomaly alert notifications to dashboard
- Visual testing and QA
- Merge to main after approval

---

## Notes

- **No frontend work in this session** - all React components remain unchanged
- **Backward compatible** - all existing Session 1/2 features continue working
- **Well-tested** - comprehensive test coverage required
- **Parallel execution** - components are independent, can be built by parallel sub-agents

---

**End of Design Specification**
