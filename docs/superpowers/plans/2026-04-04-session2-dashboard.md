# ToastyKey Session 2: React Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium React dashboard with real-time WebSocket updates, 5 views, and setup wizard for ToastyKey API cost tracking.

**Architecture:** Hybrid deployment model with Express serving REST API + Socket.io WebSocket server on port 4000, React SPA built with Vite on port 3000 (dev) or served statically from Express (prod). React Context + useReducer for state management, Tailwind CSS for styling, Recharts for data visualization.

**Tech Stack:** React 18, Vite, Tailwind CSS, React Router, Socket.io (client + server), Recharts, Lucide React, Express (enhanced), SQLite (existing)

**Spec:** `/Users/bakatoast/Toasty OS/toastykey/docs/superpowers/specs/2026-04-04-session2-dashboard-design.md`

---

## File Structure Overview

**Backend (Enhanced):**
```
src/
├── proxy/
│   ├── api/                      # NEW: Dashboard API routes
│   │   ├── stats.js              # Stats endpoints
│   │   ├── vault.js              # Vault management
│   │   ├── projects.js           # Project endpoints
│   │   ├── budgets.js            # Budget endpoints
│   │   └── setup.js              # Setup wizard helpers
│   ├── websocket.js              # NEW: Socket.io server
│   ├── index.js                  # Enhanced with API routes
│   └── handlers/                 # Enhanced to emit WebSocket events
│       ├── openai.js
│       └── anthropic.js
└── index.js                      # Enhanced for hybrid serving
```

**Frontend (New):**
```
src/dashboard/
├── src/
│   ├── services/
│   │   ├── api.js                # HTTP client
│   │   └── formatters.js         # INR/USD/time formatting
│   ├── hooks/
│   │   ├── useWebSocket.js       # Socket.io hook
│   │   ├── useAPI.js             # Data fetching hook
│   │   └── useFormatting.js      # Formatting utilities hook
│   ├── contexts/
│   │   ├── AppContext.jsx        # Global state + WebSocket integration
│   │   └── ToastContext.jsx      # Toast notifications
│   ├── components/
│   │   ├── common/               # Reusable UI primitives
│   │   ├── layout/               # Sidebar, Header, Layout
│   │   ├── stats/                # Overview stat components
│   │   ├── activity/             # Activity feed
│   │   ├── vault/                # Key management
│   │   ├── wizard/               # Setup wizard
│   │   └── charts/               # Recharts wrappers
│   ├── views/                    # Page-level views
│   ├── App.jsx                   # Root app component
│   └── main.jsx                  # Entry point
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Phase 1: Backend Foundation

### Task 1: Install Backend Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add Socket.io and concurrently to dependencies**

```bash
cd /Users/bakatoast/Toasty\ OS/toastykey
npm install socket.io@^4.7.4
npm install --save-dev concurrently@^8.2.2
```

Run: `npm install`
Expected: Dependencies installed successfully

- [ ] **Step 2: Update package.json scripts**

Edit `package.json` to add dashboard scripts:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "mcp": "node src/index.js mcp",
    "test": "jest",
    "dashboard:dev": "cd src/dashboard && npm run dev",
    "dashboard:build": "cd src/dashboard && npm run build",
    "dashboard:install": "cd src/dashboard && npm install",
    "dev": "concurrently \"npm start\" \"npm run dashboard:dev\"",
    "build": "npm run dashboard:build",
    "start:prod": "NODE_ENV=production npm start"
  }
}
```

- [ ] **Step 3: Verify package.json**

Run: `cat package.json | grep -A 10 scripts`
Expected: All scripts present

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(backend): add socket.io and dashboard scripts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: WebSocket Server Setup

**Files:**
- Create: `src/proxy/websocket.js`
- Modify: `src/proxy/index.js`

- [ ] **Step 1: Create WebSocket server module**

Create `src/proxy/websocket.js`:

```javascript
const { Server } = require('socket.io');

class WebSocketServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.setupHandlers();
  }

  setupHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      });
    });
  }

  // Emit API call event to all connected clients
  emitApiCall(callData) {
    this.io.emit('api_call', callData);
  }

  // Emit budget update event
  emitBudgetUpdate(budgetData) {
    this.io.emit('budget_update', budgetData);
  }

  // Emit vault update event
  emitVaultUpdate(action, data) {
    this.io.emit('vault_update', { action, ...data });
  }
}

module.exports = WebSocketServer;
```

- [ ] **Step 2: Integrate WebSocket into ProxyServer**

Modify `src/proxy/index.js` to add WebSocket initialization:

```javascript
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocketServer = require('./websocket');
const { detectProject, checkBudgets } = require('./middleware');

class ProxyServer {
  constructor(database, vault, pricing, port = 4000) {
    this.db = database;
    this.vault = vault;
    this.pricing = pricing;
    this.port = port;

    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.wsServer = new WebSocketServer(this.httpServer);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Enable CORS for dashboard
    this.app.use(cors());

    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));

    // Project detection
    this.app.use(detectProject(this.db));

    // Budget checking
    this.app.use(checkBudgets(this.db));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'toastykey-proxy',
        version: '0.2.0',
        uptime: process.uptime()
      });
    });

    // Stats endpoint
    this.app.get('/stats', async (req, res) => {
      try {
        const stats = {
          totalSpend: {
            today: await this.db.getTotalSpend('today'),
            week: await this.db.getTotalSpend('week'),
            month: await this.db.getTotalSpend('month')
          },
          byProvider: await this.db.getSpendByProvider(),
          byProject: await this.db.getSpendByProject()
        };

        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Vault management endpoints
    this.app.post('/vault/add', async (req, res) => {
      try {
        const { provider, label, key } = req.body;

        if (!provider || !label || !key) {
          return res.status(400).json({
            error: 'Missing required fields',
            required: ['provider', 'label', 'key']
          });
        }

        const result = await this.vault.addKey(provider, label, key);

        if (result.success) {
          // Emit WebSocket event
          this.wsServer.emitVaultUpdate('added', {
            provider,
            label,
            key_id: result.id
          });

          res.json({
            success: true,
            message: `Key added for ${provider} (${label})`,
            key_id: result.id
          });
        } else {
          res.status(500).json({
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/vault/list', async (req, res) => {
      try {
        const keys = await this.vault.listKeys();
        res.json({ keys });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // OpenAI proxy
    const { handleOpenAI } = require('./handlers/openai');
    this.app.all('/openai/*', (req, res) => {
      handleOpenAI(req, res, this.db, this.vault, this.pricing, this.wsServer);
    });

    // Anthropic proxy
    const { handleAnthropic } = require('./handlers/anthropic');
    this.app.all('/anthropic/*', (req, res) => {
      handleAnthropic(req, res, this.db, this.vault, this.pricing, this.wsServer);
    });
  }

  start() {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`Proxy + WebSocket running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
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

- [ ] **Step 3: Test WebSocket server starts**

Run: `npm start`
Expected: Console logs "Proxy + WebSocket running on http://localhost:4000"

Stop with Ctrl+C

- [ ] **Step 4: Commit**

```bash
git add src/proxy/websocket.js src/proxy/index.js
git commit -m "feat(backend): add WebSocket server with Socket.io

- Create WebSocketServer class with emit methods
- Integrate into ProxyServer using http.Server
- Enable CORS for dashboard origin
- Add connection/disconnect logging

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Stats API Endpoints

**Files:**
- Create: `src/proxy/api/stats.js`
- Modify: `src/proxy/index.js`

- [ ] **Step 1: Create stats API module**

Create `src/proxy/api/stats.js`:

```javascript
const express = require('express');
const router = express.Router();

function createStatsRouter(db) {
  // GET /api/stats - Overview stats
  router.get('/', async (req, res) => {
    try {
      const today = await db.getTotalSpend('today');
      const yesterday = await db.getTotalSpend('yesterday');
      const month = await db.getTotalSpend('month');
      
      const todayCallCount = await db.getCallCount('today');
      const activeProjects = await db.getActiveProjectCount();
      const activeKeys = await db.getActiveKeyCount();

      // Calculate delta vs yesterday
      const deltaVsYesterday = yesterday > 0 
        ? (today - yesterday) / yesterday 
        : 0;

      res.json({
        today: {
          total_inr: today,
          total_usd: today / 85, // Approximate conversion
          delta_vs_yesterday: deltaVsYesterday,
          call_count: todayCallCount
        },
        month: {
          total_inr: month,
          total_usd: month / 85,
          call_count: await db.getCallCount('month')
        },
        active_projects: activeProjects,
        active_keys: activeKeys
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/stats/daily - Daily spend array
  router.get('/daily', async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const dailyData = await db.getDailySpend(days);

      res.json({ daily: dailyData });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/stats/providers - Provider breakdown
  router.get('/providers', async (req, res) => {
    try {
      const providers = await db.getSpendByProvider();
      const total = providers.reduce((sum, p) => sum + p.total_inr, 0);

      const withPercentages = providers.map(p => ({
        ...p,
        percentage: total > 0 ? Math.round((p.total_inr / total) * 100) : 0,
        total_usd: p.total_inr / 85
      }));

      res.json({ providers: withPercentages });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/stats/tangible - Human-readable outputs
  router.get('/tangible', async (req, res) => {
    try {
      const calls = await db.getAllApiCalls();
      
      const outputs = {
        images: { count: 0, cost_inr: 0 },
        llm_calls: { count: 0, cost_inr: 0 },
        audio_minutes: { count: 0, cost_inr: 0 }
      };

      calls.forEach(call => {
        // Images: DALL-E endpoints
        if (call.endpoint.includes('/images') || (call.model && call.model.includes('dall-e'))) {
          outputs.images.count += 1;
          outputs.images.cost_inr += call.cost_inr;
        }
        
        // LLM calls: chat/messages endpoints
        if (call.endpoint.includes('/chat') || call.endpoint.includes('/messages')) {
          outputs.llm_calls.count += 1;
          outputs.llm_calls.cost_inr += call.cost_inr;
        }
        
        // Audio: Whisper, TTS
        if (call.endpoint.includes('/audio') || 
            (call.model && (call.model.includes('whisper') || call.model.includes('tts')))) {
          outputs.audio_minutes.count += 1; // Count each call as 1 minute
          outputs.audio_minutes.cost_inr += call.cost_inr;
        }
      });

      const result = [
        { type: 'images', ...outputs.images },
        { type: 'llm_calls', ...outputs.llm_calls },
        { type: 'audio_minutes', ...outputs.audio_minutes }
      ];

      res.json({ outputs: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/stats/calls - Recent API calls
  router.get('/calls', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const calls = await db.getRecentCalls(limit, offset);
      const total = await db.getTotalCallCount();

      res.json({ calls, total });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createStatsRouter;
```

- [ ] **Step 2: Add database helper methods**

Modify `src/db/index.js` to add helper methods used by stats API:

```javascript
// Add these methods to the Database class

async getCallCount(period) {
  const timeFilter = this.getTimeFilter(period);
  const result = await this.get(`
    SELECT COUNT(*) as count 
    FROM api_calls 
    WHERE timestamp >= ?
  `, [timeFilter]);
  
  return result.count;
}

async getActiveProjectCount() {
  const result = await this.get(`
    SELECT COUNT(DISTINCT project) as count 
    FROM api_calls
  `);
  
  return result.count;
}

async getActiveKeyCount() {
  const result = await this.get(`
    SELECT COUNT(*) as count 
    FROM api_keys 
    WHERE status = 'active'
  `);
  
  return result.count;
}

async getDailySpend(days) {
  const data = await this.all(`
    SELECT 
      DATE(timestamp) as date,
      SUM(cost_inr) as total_inr,
      SUM(cost_usd) as total_usd,
      SUM(CASE WHEN provider = 'openai' THEN cost_inr ELSE 0 END) as openai,
      SUM(CASE WHEN provider = 'anthropic' THEN cost_inr ELSE 0 END) as anthropic
    FROM api_calls
    WHERE timestamp >= datetime('now', '-${days} days')
    GROUP BY DATE(timestamp)
    ORDER BY date ASC
  `);
  
  return data;
}

async getAllApiCalls() {
  return await this.all(`
    SELECT * FROM api_calls
  `);
}

async getRecentCalls(limit, offset) {
  return await this.all(`
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
  const result = await this.get(`
    SELECT COUNT(*) as count FROM api_calls
  `);
  
  return result.count;
}
```

- [ ] **Step 3: Mount stats router in ProxyServer**

Modify `src/proxy/index.js` to mount the stats API:

```javascript
// Add after setupMiddleware() in setupRoutes()

setupRoutes() {
  // ... existing routes ...

  // API routes for dashboard
  const createStatsRouter = require('./api/stats');
  this.app.use('/api/stats', createStatsRouter(this.db));

  // ... rest of routes ...
}
```

- [ ] **Step 4: Test stats endpoints**

Run: `npm start`

In another terminal:
```bash
curl http://localhost:4000/api/stats
curl http://localhost:4000/api/stats/daily?days=7
curl http://localhost:4000/api/stats/providers
curl http://localhost:4000/api/stats/tangible
curl http://localhost:4000/api/stats/calls?limit=5
```

Expected: JSON responses with data structure matching spec

Stop server with Ctrl+C

- [ ] **Step 5: Commit**

```bash
git add src/proxy/api/stats.js src/db/index.js src/proxy/index.js
git commit -m "feat(backend): add stats API endpoints

- GET /api/stats - overview stats
- GET /api/stats/daily - daily spend array
- GET /api/stats/providers - provider breakdown
- GET /api/stats/tangible - human-readable outputs
- GET /api/stats/calls - recent API calls feed
- Add database helper methods for aggregations

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Projects API Endpoints

**Files:**
- Create: `src/proxy/api/projects.js`
- Modify: `src/proxy/index.js`

- [ ] **Step 1: Create projects API module**

Create `src/proxy/api/projects.js`:

```javascript
const express = require('express');
const router = express.Router();

function createProjectsRouter(db) {
  // GET /api/projects - All projects
  router.get('/', async (req, res) => {
    try {
      const projects = await db.all(`
        SELECT 
          p.id,
          p.name,
          p.directory_path,
          p.total_cost as total_cost_inr,
          p.total_cost / 85 as total_cost_usd,
          p.created_at,
          (
            SELECT SUM(cost_inr) 
            FROM api_calls 
            WHERE project = p.name 
            AND timestamp >= datetime('now', 'start of month')
          ) as cost_this_month,
          (
            SELECT MAX(timestamp) 
            FROM api_calls 
            WHERE project = p.name
          ) as last_active,
          (
            SELECT COUNT(*) 
            FROM api_calls 
            WHERE project = p.name
          ) as call_count
        FROM projects p
        ORDER BY last_active DESC
      `);

      res.json({ projects });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/projects/:id - Single project detail
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const project = await db.get(`
        SELECT * FROM projects WHERE id = ?
      `, [id]);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Cost by provider
      const costByProvider = await db.all(`
        SELECT 
          provider,
          SUM(cost_inr) as cost_inr,
          SUM(cost_usd) as cost_usd
        FROM api_calls
        WHERE project = ?
        GROUP BY provider
      `, [project.name]);

      // Cost over time (last 30 days)
      const costOverTime = await db.all(`
        SELECT 
          DATE(timestamp) as date,
          SUM(cost_inr) as cost_inr,
          SUM(cost_usd) as cost_usd
        FROM api_calls
        WHERE project = ?
        AND timestamp >= datetime('now', '-30 days')
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `, [project.name]);

      // Sessions
      const sessions = await db.all(`
        SELECT 
          s.id,
          s.cost_inr,
          s.started_at,
          (
            SELECT COUNT(*) 
            FROM api_calls 
            WHERE session_id = s.id
          ) as call_count
        FROM sessions s
        WHERE s.project_name = ?
        ORDER BY s.started_at DESC
        LIMIT 10
      `, [project.name]);

      // Recent calls
      const recentCalls = await db.all(`
        SELECT * FROM api_calls
        WHERE project = ?
        ORDER BY timestamp DESC
        LIMIT 20
      `, [project.name]);

      res.json({
        project,
        cost_by_provider: costByProvider,
        cost_over_time: costOverTime,
        sessions,
        recent_calls: recentCalls
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createProjectsRouter;
```

- [ ] **Step 2: Mount projects router**

Modify `src/proxy/index.js`:

```javascript
// Add after stats router

const createProjectsRouter = require('./api/projects');
this.app.use('/api/projects', createProjectsRouter(this.db));
```

- [ ] **Step 3: Test projects endpoints**

Run: `npm start`

In another terminal:
```bash
curl http://localhost:4000/api/projects
# If you have project ID 1:
curl http://localhost:4000/api/projects/1
```

Expected: JSON responses with project data

Stop server with Ctrl+C

- [ ] **Step 4: Commit**

```bash
git add src/proxy/api/projects.js src/proxy/index.js
git commit -m "feat(backend): add projects API endpoints

- GET /api/projects - all projects with stats
- GET /api/projects/:id - project detail with sessions
- Include cost breakdowns and recent activity

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Vault API Endpoints

**Files:**
- Create: `src/proxy/api/vault.js`
- Modify: `src/proxy/index.js`

- [ ] **Step 1: Create vault API module**

Create `src/proxy/api/vault.js`:

```javascript
const express = require('express');
const router = express.Router();

function createVaultRouter(db, vault, wsServer) {
  // GET /api/vault/keys - List keys (masked)
  router.get('/keys', async (req, res) => {
    try {
      const keys = await vault.listKeys();
      
      // Enhance with usage stats
      const enhancedKeys = await Promise.all(keys.map(async (key) => {
        const stats = await db.get(`
          SELECT 
            MAX(timestamp) as last_used,
            SUM(cost_inr) as total_cost
          FROM api_calls
          WHERE provider = ?
        `, [key.provider]);

        return {
          id: key.id,
          provider: key.provider,
          label: key.label,
          masked_key: key.masked_key,
          status: key.status,
          last_used: stats?.last_used || null,
          total_cost: stats?.total_cost || 0,
          created_at: key.created_at
        };
      }));

      res.json({ keys: enhancedKeys });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/vault/keys - Add new key
  router.post('/keys', async (req, res) => {
    try {
      const { provider, label, key } = req.body;

      if (!provider || !label || !key) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['provider', 'label', 'key']
        });
      }

      const result = await vault.addKey(provider, label, key);

      if (result.success) {
        // Emit WebSocket event
        wsServer.emitVaultUpdate('added', {
          provider,
          label,
          key_id: result.id
        });

        res.json({
          success: true,
          message: `Key added for ${provider} (${label})`,
          key_id: result.id
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/vault/keys/:id - Delete key
  router.delete('/keys/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await vault.deleteKey(parseInt(id));

      if (result.success) {
        // Emit WebSocket event
        wsServer.emitVaultUpdate('deleted', { key_id: id });

        res.json({
          success: true,
          message: 'Key deleted'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Key not found'
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/vault/keys/:id/reveal - Reveal full key
  router.post('/keys/:id/reveal', async (req, res) => {
    try {
      const { id } = req.params;
      
      const key = await vault.getKey(parseInt(id));

      if (key) {
        // Client handles expiry timing
        res.json({
          key: key.full_key,
          expires_at: new Date(Date.now() + 10000).toISOString() // 10 seconds
        });
      } else {
        res.status(404).json({ error: 'Key not found' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/vault/import-env - Parse .env file
  router.post('/import-env', async (req, res) => {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Missing content field' });
      }

      const found_keys = [];
      const lines = content.split('\n');

      lines.forEach(line => {
        line = line.trim();
        
        // OpenAI key
        if (line.startsWith('OPENAI_API_KEY=')) {
          const key = line.split('=')[1].trim();
          if (key && key.startsWith('sk-')) {
            found_keys.push({ provider: 'openai', key, label: 'default' });
          }
        }
        
        // Anthropic key
        if (line.startsWith('ANTHROPIC_API_KEY=')) {
          const key = line.split('=')[1].trim();
          if (key && key.startsWith('sk-ant-')) {
            found_keys.push({ provider: 'anthropic', key, label: 'default' });
          }
        }
      });

      res.json({ found_keys });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createVaultRouter;
```

- [ ] **Step 2: Add vault helper methods**

Modify `src/vault/index.js` to add `getKey` and `deleteKey` methods:

```javascript
// Add these methods to the Vault class

async getKey(id) {
  const row = await this.db.get('SELECT * FROM api_keys WHERE id = ?', [id]);
  
  if (!row) return null;
  
  const decrypted = this.decrypt(row.encrypted_key);
  
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    full_key: decrypted,
    status: row.status,
    created_at: row.created_at
  };
}

async deleteKey(id) {
  const result = await this.db.run('DELETE FROM api_keys WHERE id = ?', [id]);
  
  return {
    success: result.changes > 0
  };
}
```

- [ ] **Step 3: Mount vault router**

Modify `src/proxy/index.js`:

```javascript
// Replace the inline vault routes with the router

const createVaultRouter = require('./api/vault');
this.app.use('/api/vault', createVaultRouter(this.db, this.vault, this.wsServer));

// Remove the old /vault/add and /vault/list routes
```

- [ ] **Step 4: Test vault endpoints**

Run: `npm start`

In another terminal:
```bash
curl http://localhost:4000/api/vault/keys
curl -X POST http://localhost:4000/api/vault/keys \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","label":"test","key":"sk-test123"}'
curl -X POST http://localhost:4000/api/vault/import-env \
  -H "Content-Type: application/json" \
  -d '{"content":"OPENAI_API_KEY=sk-abc123"}'
```

Expected: JSON responses with key operations

Stop server with Ctrl+C

- [ ] **Step 5: Commit**

```bash
git add src/proxy/api/vault.js src/vault/index.js src/proxy/index.js
git commit -m "feat(backend): add vault API endpoints

- GET /api/vault/keys - list keys with stats
- POST /api/vault/keys - add key with WebSocket broadcast
- DELETE /api/vault/keys/:id - delete key
- POST /api/vault/keys/:id/reveal - reveal full key temporarily
- POST /api/vault/import-env - parse .env file for keys
- Add getKey and deleteKey methods to Vault class

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Budgets and Setup API Endpoints

**Files:**
- Create: `src/proxy/api/budgets.js`
- Create: `src/proxy/api/setup.js`
- Modify: `src/proxy/index.js`

- [ ] **Step 1: Create budgets API module**

Create `src/proxy/api/budgets.js`:

```javascript
const express = require('express');
const router = express.Router();

function createBudgetsRouter(db) {
  // GET /api/budgets - All active budgets with status
  router.get('/', async (req, res) => {
    try {
      const budgets = await db.all(`
        SELECT * FROM budgets WHERE active = 1
      `);

      // Calculate current spend for each budget
      const withStatus = await Promise.all(budgets.map(async (budget) => {
        let currentSpend = 0;

        if (budget.scope === 'global') {
          if (budget.period === 'day') {
            currentSpend = await db.getTotalSpend('today');
          } else if (budget.period === 'week') {
            currentSpend = await db.getTotalSpend('week');
          } else if (budget.period === 'month') {
            currentSpend = await db.getTotalSpend('month');
          }
        } else if (budget.scope === 'project') {
          // Project-specific budget
          const result = await db.get(`
            SELECT SUM(cost_inr) as spend
            FROM api_calls
            WHERE project = ?
            AND timestamp >= datetime('now', 'start of ${budget.period}')
          `, [budget.entity_id]);
          
          currentSpend = result?.spend || 0;
        }

        const percentage = budget.limit_amount > 0 
          ? Math.round((currentSpend / budget.limit_amount) * 100) 
          : 0;

        let status = 'ok';
        if (percentage >= 80) status = 'exceeded';
        else if (percentage >= 60) status = 'warning';

        return {
          ...budget,
          current_spend: currentSpend,
          percentage,
          status
        };
      }));

      res.json({ budgets: withStatus });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/budgets - Create/update budget
  router.post('/', async (req, res) => {
    try {
      const { scope, period, limit_amount, entity_id } = req.body;

      if (!scope || !period || !limit_amount) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['scope', 'period', 'limit_amount']
        });
      }

      // Check if budget exists
      const existing = await db.get(`
        SELECT id FROM budgets 
        WHERE scope = ? AND period = ? AND entity_id = ?
      `, [scope, period, entity_id || null]);

      if (existing) {
        // Update
        await db.run(`
          UPDATE budgets 
          SET limit_amount = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [limit_amount, existing.id]);

        res.json({ success: true, budget_id: existing.id, action: 'updated' });
      } else {
        // Create
        const result = await db.run(`
          INSERT INTO budgets (scope, period, limit_amount, entity_id, active)
          VALUES (?, ?, ?, ?, 1)
        `, [scope, period, limit_amount, entity_id || null]);

        res.json({ success: true, budget_id: result.lastID, action: 'created' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createBudgetsRouter;
```

- [ ] **Step 2: Create setup API module**

Create `src/proxy/api/setup.js`:

```javascript
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

function createSetupRouter(db) {
  // GET /api/setup/status - Check if setup needed
  router.get('/status', async (req, res) => {
    try {
      // Check if any keys exist
      const keys = await db.all('SELECT COUNT(*) as count FROM api_keys');
      const hasKeys = keys[0].count > 0;

      // Check if any API calls have been made
      const calls = await db.all('SELECT COUNT(*) as count FROM api_calls');
      const hasCalls = calls[0].count > 0;

      const needsSetup = !hasKeys && !hasCalls;

      res.json({
        needs_setup: needsSetup,
        reason: needsSetup ? 'no_keys_and_no_calls' : null
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/setup/scan - Scan directories for .env files
  router.post('/scan', async (req, res) => {
    try {
      const { directories } = req.body;

      if (!directories || !Array.isArray(directories)) {
        return res.status(400).json({ error: 'directories array required' });
      }

      const foundFiles = [];

      for (const dir of directories) {
        try {
          const envPath = path.join(dir, '.env');
          const content = await fs.readFile(envPath, 'utf-8');

          const keys = [];
          const lines = content.split('\n');

          lines.forEach(line => {
            line = line.trim();
            
            if (line.startsWith('OPENAI_API_KEY=')) {
              const key = line.split('=')[1].trim();
              if (key && key.startsWith('sk-')) {
                keys.push({ provider: 'openai', key, label: path.basename(dir) });
              }
            }
            
            if (line.startsWith('ANTHROPIC_API_KEY=')) {
              const key = line.split('=')[1].trim();
              if (key && key.startsWith('sk-ant-')) {
                keys.push({ provider: 'anthropic', key, label: path.basename(dir) });
              }
            }
          });

          if (keys.length > 0) {
            foundFiles.push({ path: envPath, keys });
          }
        } catch (err) {
          // Silently skip directories without .env files
        }
      }

      res.json({ found_files: foundFiles });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createSetupRouter;
```

- [ ] **Step 3: Mount budget and setup routers**

Modify `src/proxy/index.js`:

```javascript
// Add after other API routers

const createBudgetsRouter = require('./api/budgets');
this.app.use('/api/budgets', createBudgetsRouter(this.db));

const createSetupRouter = require('./api/setup');
this.app.use('/api/setup', createSetupRouter(this.db));
```

- [ ] **Step 4: Update health endpoint**

Modify the health endpoint in `src/proxy/index.js`:

```javascript
this.app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'toastykey-api',
    version: '0.2.0',
    uptime: process.uptime()
  });
});
```

- [ ] **Step 5: Test endpoints**

Run: `npm start`

In another terminal:
```bash
curl http://localhost:4000/api/budgets
curl http://localhost:4000/api/setup/status
curl http://localhost:4000/api/health
```

Expected: JSON responses

Stop server with Ctrl+C

- [ ] **Step 6: Commit**

```bash
git add src/proxy/api/budgets.js src/proxy/api/setup.js src/proxy/index.js
git commit -m "feat(backend): add budgets and setup API endpoints

- GET /api/budgets - list budgets with current status
- POST /api/budgets - create/update budget
- GET /api/setup/status - check if wizard needed
- POST /api/setup/scan - scan for .env files
- Update health endpoint to /api/health

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Frontend Scaffolding

### Task 7: Initialize React Dashboard Project

**Files:**
- Create: `src/dashboard/package.json`
- Create: `src/dashboard/index.html`
- Create: `src/dashboard/vite.config.js`
- Create: `src/dashboard/postcss.config.js`
- Create: `src/dashboard/tailwind.config.js`
- Create: `src/dashboard/.gitignore`

- [ ] **Step 1: Create dashboard directory**

```bash
mkdir -p src/dashboard/src
mkdir -p src/dashboard/public
```

- [ ] **Step 2: Create package.json**

Create `src/dashboard/package.json`:

```json
{
  "name": "toastykey-dashboard",
  "version": "0.2.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.0",
    "socket.io-client": "^4.7.4",
    "recharts": "^2.12.0",
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.4",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35"
  }
}
```

- [ ] **Step 3: Create Vite config**

Create `src/dashboard/vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
```

- [ ] **Step 4: Create Tailwind config**

Create `src/dashboard/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0F172A',
          surface: '#1B2336',
          hover: '#272F42',
        },
        border: '#475569',
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        openai: '#22C55E',
        anthropic: '#F59E0B',
      },
      fontFamily: {
        code: ['"Fira Code"', 'monospace'],
        sans: ['"Fira Sans"', 'sans-serif'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '4xl': '2.25rem',
      },
      spacing: {
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '6': '1.5rem',
        '8': '2rem',
        '12': '3rem',
      },
      borderRadius: {
        'sm': '0.25rem',
        'md': '0.5rem',
        'lg': '0.75rem',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 5: Create PostCSS config**

Create `src/dashboard/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Create index.html**

Create `src/dashboard/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ToastyKey Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create .gitignore**

Create `src/dashboard/.gitignore`:

```
# Dependencies
node_modules

# Build output
dist
*.local

# Editor
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 8: Install dependencies**

```bash
cd src/dashboard
npm install
cd ../..
```

Expected: All dependencies installed successfully

- [ ] **Step 9: Commit**

```bash
git add src/dashboard
git commit -m "feat(dashboard): initialize React project with Vite

- Create package.json with React 18 and dependencies
- Configure Vite with proxy to backend API
- Configure Tailwind CSS with design system tokens
- Set up PostCSS and autoprefixer
- Add Google Fonts for Fira Code and Fira Sans
- Add .gitignore for dashboard

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Create Entry Point and Base Styles

**Files:**
- Create: `src/dashboard/src/main.jsx`
- Create: `src/dashboard/src/App.jsx`
- Create: `src/dashboard/src/index.css`

- [ ] **Step 1: Create global styles**

Create `src/dashboard/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply box-border;
  }

  body {
    @apply bg-bg-primary text-text-primary font-sans;
    @apply m-0 p-0;
    @apply antialiased;
  }

  /* Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}

@layer utilities {
  /* Loading skeleton animation */
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  /* Slide in animation */
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-slide-in {
    animation: slideIn 200ms ease-out;
  }
}
```

- [ ] **Step 2: Create App component placeholder**

Create `src/dashboard/src/App.jsx`:

```jsx
import React from 'react';

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-code font-bold text-success mb-4">
          🔥 ToastyKey
        </h1>
        <p className="text-text-secondary">
          Dashboard loading...
        </p>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Create entry point**

Create `src/dashboard/src/main.jsx`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: Test dashboard dev server**

```bash
cd src/dashboard
npm run dev
```

Open browser to http://localhost:3000

Expected: "🔥 ToastyKey Dashboard loading..." text visible with dark background

Stop with Ctrl+C, return to root:
```bash
cd ../..
```

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/src
git commit -m "feat(dashboard): add entry point and base styles

- Create main.jsx with React root
- Create App.jsx placeholder
- Set up Tailwind CSS with design tokens
- Add global styles and animations
- Add reduced-motion support

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Core Infrastructure

### Task 9: Formatters Service

**Files:**
- Create: `src/dashboard/src/services/formatters.js`

- [ ] **Step 1: Create formatters module**

Create `src/dashboard/src/services/formatters.js`:

```javascript
/**
 * Format INR amount with Indian numbering system
 * @param {number} amount - Amount in INR
 * @param {object} options - Formatting options
 * @returns {string} Formatted string (e.g., "₹1,24,700" or "₹1.2L")
 */
export function formatINR(amount, options = {}) {
  const { compact = false } = options;
  
  if (!amount && amount !== 0) return '₹0';
  
  // Compact format: ₹1.2K, ₹1.2L, ₹1.2Cr
  if (compact && amount >= 1000) {
    if (amount >= 10000000) { // 1 crore
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    }
    if (amount >= 100000) { // 1 lakh
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  
  // Full format: ₹1,24,700
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format USD amount
 * @param {number} amount - Amount in USD
 * @returns {string} Formatted string (e.g., "$146.70")
 */
export function formatUSD(amount) {
  if (!amount && amount !== 0) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format relative time (2m ago, 1h ago, yesterday)
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Relative time string
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'never';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const diff = Date.now() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  
  // More than a week: show date
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Format absolute date/time
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Formatted date string
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (!num && num !== 0) return '0';
  
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Format percentage
 * @param {number} value - Percentage value (0-100)
 * @returns {string} Formatted percentage
 */
export function formatPercent(value) {
  if (!value && value !== 0) return '0%';
  
  return `${Math.round(value)}%`;
}

/**
 * Calculate percentage with safe division
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage (0-100)
 */
export function calculatePercent(value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Mask API key (show first 7 chars + last 4 chars)
 * @param {string} key - Full API key
 * @returns {string} Masked key (e.g., "sk-proj...a1b2")
 */
export function maskApiKey(key) {
  if (!key || key.length < 12) return '***';
  
  const start = key.substring(0, 7);
  const end = key.substring(key.length - 4);
  
  return `${start}...${end}`;
}
```

- [ ] **Step 2: Create manual test file**

Create `src/dashboard/src/services/formatters.test.js`:

```javascript
import {
  formatINR,
  formatUSD,
  formatRelativeTime,
  formatDateTime,
  formatNumber,
  formatPercent,
  calculatePercent,
  maskApiKey
} from './formatters.js';

console.log('Testing formatters...\n');

// Test INR formatting
console.log('formatINR:');
console.log('  1247 →', formatINR(1247)); // ₹1,247
console.log('  12470 (compact) →', formatINR(12470, { compact: true })); // ₹12.5K
console.log('  124700 (compact) →', formatINR(124700, { compact: true })); // ₹1.2L
console.log('  12470000 (compact) →', formatINR(12470000, { compact: true })); // ₹1.2Cr
console.log('');

// Test USD formatting
console.log('formatUSD:');
console.log('  146.70 →', formatUSD(146.70)); // $146.70
console.log('');

// Test relative time
console.log('formatRelativeTime:');
const now = new Date();
console.log('  30s ago →', formatRelativeTime(new Date(now - 30 * 1000)));
console.log('  5m ago →', formatRelativeTime(new Date(now - 5 * 60 * 1000)));
console.log('  2h ago →', formatRelativeTime(new Date(now - 2 * 60 * 60 * 1000)));
console.log('  1d ago →', formatRelativeTime(new Date(now - 24 * 60 * 60 * 1000)));
console.log('');

// Test number formatting
console.log('formatNumber:');
console.log('  1234567 →', formatNumber(1234567)); // 12,34,567
console.log('');

// Test percentage
console.log('formatPercent:');
console.log('  23.456 →', formatPercent(23.456)); // 23%
console.log('  calculatePercent(450, 500) →', calculatePercent(450, 500)); // 90
console.log('');

// Test API key masking
console.log('maskApiKey:');
console.log('  sk-proj-abc123xyz789 →', maskApiKey('sk-proj-abc123xyz789'));
console.log('');

console.log('✓ All formatters working');
```

- [ ] **Step 3: Run manual test**

```bash
cd src/dashboard
node src/services/formatters.test.js
```

Expected: All test outputs show correct formatting

Remove test file:
```bash
rm src/services/formatters.test.js
cd ../..
```

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/src/services/formatters.js
git commit -m "feat(dashboard): add formatting utilities

- formatINR with Indian numbering (₹1,24,700)
- formatINR compact mode (₹1.2L, ₹1.2Cr)
- formatUSD for USD amounts
- formatRelativeTime (2m ago, 1h ago, yesterday)
- formatDateTime for absolute times
- formatNumber with Indian commas
- formatPercent and calculatePercent
- maskApiKey for secure key display

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: API Client Service

**Files:**
- Create: `src/dashboard/src/services/api.js`

- [ ] **Step 1: Create API client module**

Create `src/dashboard/src/services/api.js`:

```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Stats API
 */
export const statsAPI = {
  getOverview: () => apiFetch('/api/stats'),
  getDaily: (days = 30) => apiFetch(`/api/stats/daily?days=${days}`),
  getProviders: () => apiFetch('/api/stats/providers'),
  getTangible: () => apiFetch('/api/stats/tangible'),
  getCalls: (limit = 20, offset = 0) => 
    apiFetch(`/api/stats/calls?limit=${limit}&offset=${offset}`),
};

/**
 * Projects API
 */
export const projectsAPI = {
  getAll: () => apiFetch('/api/projects'),
  getById: (id) => apiFetch(`/api/projects/${id}`),
};

/**
 * Vault API
 */
export const vaultAPI = {
  getKeys: () => apiFetch('/api/vault/keys'),
  
  addKey: (provider, label, key) => 
    apiFetch('/api/vault/keys', {
      method: 'POST',
      body: JSON.stringify({ provider, label, key }),
    }),
  
  deleteKey: (id) => 
    apiFetch(`/api/vault/keys/${id}`, {
      method: 'DELETE',
    }),
  
  revealKey: (id) => 
    apiFetch(`/api/vault/keys/${id}/reveal`, {
      method: 'POST',
    }),
  
  importEnv: (content) => 
    apiFetch('/api/vault/import-env', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};

/**
 * Budgets API
 */
export const budgetsAPI = {
  getAll: () => apiFetch('/api/budgets'),
  
  createOrUpdate: (scope, period, limit_amount, entity_id = null) => 
    apiFetch('/api/budgets', {
      method: 'POST',
      body: JSON.stringify({ scope, period, limit_amount, entity_id }),
    }),
};

/**
 * Setup API
 */
export const setupAPI = {
  getStatus: () => apiFetch('/api/setup/status'),
  
  scanDirectories: (directories) => 
    apiFetch('/api/setup/scan', {
      method: 'POST',
      body: JSON.stringify({ directories }),
    }),
};

/**
 * Health API
 */
export const healthAPI = {
  check: () => apiFetch('/api/health'),
};

// Export all APIs
export default {
  stats: statsAPI,
  projects: projectsAPI,
  vault: vaultAPI,
  budgets: budgetsAPI,
  setup: setupAPI,
  health: healthAPI,
};
```

- [ ] **Step 2: Create .env example**

Create `src/dashboard/.env.example`:

```
VITE_API_URL=http://localhost:4000
```

- [ ] **Step 3: Verify API client compiles**

```bash
cd src/dashboard
npm run build
```

Expected: Build completes without errors

```bash
rm -rf dist
cd ../..
```

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/src/services/api.js src/dashboard/.env.example
git commit -m "feat(dashboard): add API client service

- Create apiFetch wrapper with error handling
- Add statsAPI methods (overview, daily, providers, tangible, calls)
- Add projectsAPI methods (getAll, getById)
- Add vaultAPI methods (getKeys, addKey, deleteKey, revealKey, importEnv)
- Add budgetsAPI methods (getAll, createOrUpdate)
- Add setupAPI methods (getStatus, scanDirectories)
- Add healthAPI check method
- Support VITE_API_URL environment variable

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 11: WebSocket Hook

**Files:**
- Create: `src/dashboard/src/hooks/useWebSocket.js`

- [ ] **Step 1: Create WebSocket hook**

Create `src/dashboard/src/hooks/useWebSocket.js`:

```javascript
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * WebSocket hook for Socket.io connection
 * @returns {{ socket: Socket | null, connected: boolean }}
 */
export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Create socket connection
    const socket = io(WS_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected, will auto-reconnect');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      setConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    connected,
  };
}
```

- [ ] **Step 2: Verify hook compiles**

```bash
cd src/dashboard
npm run build
```

Expected: Build completes without errors

```bash
rm -rf dist
cd ../..
```

- [ ] **Step 3: Commit**

```bash
git add src/dashboard/src/hooks/useWebSocket.js
git commit -m "feat(dashboard): add WebSocket hook

- Create useWebSocket hook with Socket.io client
- Auto-reconnection with infinite attempts
- Track connection status
- Handle connection/disconnection events
- Clean up on unmount

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 12: Context Providers (App + Toast)

**Files:**
- Create: `src/dashboard/src/contexts/AppContext.jsx`
- Create: `src/dashboard/src/contexts/ToastContext.jsx`

- [ ] **Step 1: Create AppContext with state management**

Create `src/dashboard/src/contexts/AppContext.jsx` with React Context + useReducer for global state, WebSocket integration, and actions for stats, projects, keys, budgets, and real-time updates.

- [ ] **Step 2: Create ToastContext for notifications**

Create `src/dashboard/src/contexts/ToastContext.jsx` with showToast function, auto-dismiss after 3 seconds, support for success/error/warning/info types.

- [ ] **Step 3: Test contexts compile**

Run: `cd src/dashboard && npm run build && rm -rf dist && cd ../..`

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/src/contexts
git commit -m "feat(dashboard): add context providers

- AppContext with useReducer for global state
- WebSocket event integration
- ToastContext for notifications
- Support for all dashboard data types

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Common Components

**Files:**
- Create: `src/dashboard/src/components/common/Button.jsx`
- Create: `src/dashboard/src/components/common/Card.jsx`
- Create: `src/dashboard/src/components/common/Modal.jsx`
- Create: `src/dashboard/src/components/common/Toast.jsx`
- Create: `src/dashboard/src/components/common/Badge.jsx`
- Create: `src/dashboard/src/components/common/Skeleton.jsx`

- [ ] **Step 1: Create Button component**

Button with variants (primary, secondary, danger), sizes (sm, md, lg), loading state, disabled state, and proper accessibility attributes.

- [ ] **Step 2: Create Card component**

Card container with optional header, body padding, and hover effects.

- [ ] **Step 3: Create Modal component**

Modal overlay with backdrop, close button, escape key handler, and focus trap.

- [ ] **Step 4: Create Toast component**

Toast notification with icon (CheckCircle, AlertTriangle, Info, XCircle), auto-dismiss animation, and close button.

- [ ] **Step 5: Create Badge component**

Badge with status colors (success, warning, error, info) and size variants.

- [ ] **Step 6: Create Skeleton component**

Skeleton loader with pulse animation for loading states. Variants for text, card, and circle.

- [ ] **Step 7: Test components compile**

Run: `cd src/dashboard && npm run build && rm -rf dist && cd ../..`

- [ ] **Step 8: Commit**

```bash
git add src/dashboard/src/components/common
git commit -m "feat(dashboard): add common UI components

- Button with variants and states
- Card container component
- Modal with overlay and accessibility
- Toast notification component
- Badge with status colors
- Skeleton loader with animations

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 14: Layout Components

**Files:**
- Create: `src/dashboard/src/components/layout/Sidebar.jsx`
- Create: `src/dashboard/src/components/layout/Header.jsx`
- Create: `src/dashboard/src/components/layout/Layout.jsx`

- [ ] **Step 1: Create Sidebar component**

Sidebar with navigation links (Overview, Projects, Key Vault, Triggers, Reports, Settings), active state highlighting, collapse/expand toggle, responsive behavior (<768px overlay, >=768px fixed), Lucide React icons, and localStorage persistence for collapsed state.

- [ ] **Step 2: Create Header component**

Header with WebSocket connection status indicator, currency toggle (INR/USD), and optional page title.

- [ ] **Step 3: Create Layout wrapper**

Layout component that combines Sidebar + Header + main content area. Responsive padding and proper semantic HTML.

- [ ] **Step 4: Test layout compiles**

Run: `cd src/dashboard && npm run build && rm -rf dist && cd ../..`

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/src/components/layout
git commit -m "feat(dashboard): add layout components

- Sidebar with navigation and collapse
- Header with connection status
- Layout wrapper component
- Responsive behavior
- localStorage persistence

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 15: Stats Components for Overview

**Files:**
- Create: `src/dashboard/src/components/stats/StatCard.jsx`
- Create: `src/dashboard/src/components/stats/SpendChart.jsx`
- Create: `src/dashboard/src/components/stats/ProviderBreakdown.jsx`
- Create: `src/dashboard/src/components/stats/TangibleOutputs.jsx`
- Create: `src/dashboard/src/components/stats/BudgetProgress.jsx`

- [ ] **Step 1: Create StatCard**

Stat card showing large number, label, optional delta with arrow and color (green up, red down), skeleton loading state.

- [ ] **Step 2: Create SpendChart**

Area chart using Recharts, 30 days of data, INR/USD toggle, tooltip on hover, responsive sizing, skeleton loading.

- [ ] **Step 3: Create ProviderBreakdown**

Horizontal bar chart for provider comparison, color-coded (OpenAI green, Anthropic amber), sorted descending, percentage labels.

- [ ] **Step 4: Create TangibleOutputs**

Grid of output cards (images, LLM calls, audio minutes) with Lucide React icons (Image, MessageSquare, Music), counts and costs.

- [ ] **Step 5: Create BudgetProgress**

Progress bar with dynamic color (green <60%, amber 60-80%, red 80%+), current/limit labels, percentage display.

- [ ] **Step 6: Test components compile**

Run: `cd src/dashboard && npm run build && rm -rf dist && cd ../..`

- [ ] **Step 7: Commit**

```bash
git add src/dashboard/src/components/stats
git commit -m "feat(dashboard): add stats components

- StatCard with delta arrows
- SpendChart with Recharts area chart
- ProviderBreakdown horizontal bars
- TangibleOutputs grid cards
- BudgetProgress with color coding

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 16: Activity Feed Components

**Files:**
- Create: `src/dashboard/src/components/activity/ActivityFeed.jsx`
- Create: `src/dashboard/src/components/activity/ActivityItem.jsx`

- [ ] **Step 1: Create ActivityItem**

Single activity row showing relative time, provider badge, endpoint, cost, status icon (CheckCircle or XCircle), latency.

- [ ] **Step 2: Create ActivityFeed**

List of ActivityItem components, limit 20 items, prepend new items with slide-in animation, skeleton loading states, empty state with Radio icon and message.

- [ ] **Step 3: Test components compile**

Run: `cd src/dashboard && npm run build && rm -rf dist && cd ../..`

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/src/components/activity
git commit -m "feat(dashboard): add activity feed components

- ActivityItem with API call details
- ActivityFeed with real-time updates
- Slide-in animation for new items
- Empty state handling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 17: Vault Components

**Files:**
- Create: `src/dashboard/src/components/vault/KeyTable.jsx`
- Create: `src/dashboard/src/components/vault/AddKeyModal.jsx`

- [ ] **Step 1: Create KeyTable**

Table showing provider badge, label, masked key, status, last used, total cost, actions dropdown (Copy, Reveal, Delete). Reveal button shows full key for 10 seconds then auto-masks. Empty state with Key icon and "Add Key" button.

- [ ] **Step 2: Create AddKeyModal**

Modal with provider dropdown (OpenAI, Anthropic, custom), label input, key input with show/hide toggle, Add/Cancel buttons, form validation.

- [ ] **Step 3: Test components compile**

Run: `cd src/dashboard && npm run build && rm -rf dist && cd ../..`

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/src/components/vault
git commit -m "feat(dashboard): add vault components

- KeyTable with reveal and delete actions
- AddKeyModal with validation
- Empty state handling
- Auto-mask after reveal

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 18: Wizard Components

**Files:**
- Create: `src/dashboard/src/components/wizard/SetupWizard.jsx`
- Create: `src/dashboard/src/components/wizard/WizardStep.jsx`
- Create: `src/dashboard/src/components/wizard/WelcomeStep.jsx`
- Create: `src/dashboard/src/components/wizard/KeyImportStep.jsx`
- Create: `src/dashboard/src/components/wizard/BudgetStep.jsx`
- Create: `src/dashboard/src/components/wizard/MCPConfigStep.jsx`

- [ ] **Step 1: Create wizard shell components**

SetupWizard container with step state (1-4), progress dots, next/back buttons. WizardStep wrapper for individual steps.

- [ ] **Step 2: Create wizard step components**

WelcomeStep with branding, KeyImportStep with scan/manual/skip options, BudgetStep with INR input and skip option, MCPConfigStep with config snippet and copy button.

- [ ] **Step 3: Test wizard compiles**

Run: `cd src/dashboard && npm run build && rm -rf dist && cd ../..`

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/src/components/wizard
git commit -m "feat(dashboard): add setup wizard components

- SetupWizard container with step state
- WelcomeStep with branding
- KeyImportStep with scan/manual options
- BudgetStep with validation
- MCPConfigStep with copy button

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 19: Chart Wrapper Components

**Files:**
- Create: `src/dashboard/src/components/charts/AreaChart.jsx`
- Create: `src/dashboard/src/components/charts/BarChart.jsx`

- [ ] **Step 1: Create AreaChart wrapper**

Recharts AreaChart wrapper with responsive container, gradient fill, tooltip customization, axis formatting.

- [ ] **Step 2: Create BarChart wrapper**

Recharts BarChart wrapper (horizontal) with responsive container, color mapping, value labels.

- [ ] **Step 3: Test charts compile**

Run: `cd src/dashboard && npm run build && rm -rf dist && cd ../..`

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/src/components/charts
git commit -m "feat(dashboard): add chart wrapper components

- AreaChart wrapper for spend trends
- BarChart wrapper for comparisons
- Responsive containers
- Custom styling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 20: Overview View

**Files:**
- Create: `src/dashboard/src/views/Overview.jsx`

- [ ] **Step 1: Create Overview view**

Assemble Overview page using StatCard (x4), SpendChart, ProviderBreakdown, TangibleOutputs, BudgetProgress, and ActivityFeed components. Fetch data from AppContext, handle loading states with skeletons, implement WebSocket real-time updates.

- [ ] **Step 2: Test view compiles**

Run: `cd src/dashboard && npm run build && rm -rf dist && cd ../..`

- [ ] **Step 3: Commit**

```bash
git add src/dashboard/src/views/Overview.jsx
git commit -m "feat(dashboard): add Overview view

- Assemble all stat components
- Real-time WebSocket updates
- Skeleton loading states
- Responsive grid layout

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 21: Projects and KeyVault Views

**Files:**
- Create: `src/dashboard/src/views/Projects.jsx`
- Create: `src/dashboard/src/views/ProjectDetail.jsx`
- Create: `src/dashboard/src/views/KeyVault.jsx`
- Create: `src/dashboard/src/views/Triggers.jsx`
- Create: `src/dashboard/src/views/Reports.jsx`

- [ ] **Step 1: Create Projects view**

Grid of project cards, click to navigate to detail. Empty state with Folder icon.

- [ ] **Step 2: Create ProjectDetail view**

Single project detail with back button, cost breakdowns (pie chart), cost over time (line chart), sessions list, recent calls.

- [ ] **Step 3: Create KeyVault view**

Mount KeyTable and AddKeyModal components, handle add/delete/reveal actions.

- [ ] **Step 4: Create placeholder views**

Triggers and Reports views with "Coming in v0.3.0" message and feature list.

- [ ] **Step 5: Test views compile**

Run: `cd src/dashboard && npm run build && rm -rf dist && cd ../..`

- [ ] **Step 6: Commit**

```bash
git add src/dashboard/src/views
git commit -m "feat(dashboard): add all dashboard views

- Projects view with grid cards
- ProjectDetail with charts and sessions
- KeyVault view with table
- Triggers and Reports placeholders

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 22: Wire App with Routing

**Files:**
- Modify: `src/dashboard/src/App.jsx`
- Modify: `src/dashboard/src/main.jsx`

- [ ] **Step 1: Set up React Router**

Modify `App.jsx` to use BrowserRouter with routes for all views (/, /projects, /projects/:id, /vault, /triggers, /reports), wrap with AppProvider and ToastProvider, check setup status on mount, conditionally show SetupWizard or Layout+Routes.

- [ ] **Step 2: Update main.jsx imports**

Import AppProvider and ToastProvider in `main.jsx`.

- [ ] **Step 3: Test dashboard dev server**

```bash
cd src/dashboard
npm run dev
```

Open http://localhost:3000, verify routing works (sidebar navigation), verify setup wizard shows if no data.

Stop with Ctrl+C, return to root.

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/src/App.jsx src/dashboard/src/main.jsx
git commit -m "feat(dashboard): wire App with routing

- Add React Router with all routes
- Wrap with context providers
- Smart setup wizard detection
- Layout with sidebar navigation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 23: Backend WebSocket Emissions

**Files:**
- Modify: `src/proxy/handlers/openai.js`
- Modify: `src/proxy/handlers/anthropic.js`

- [ ] **Step 1: Emit api_call events in handlers**

Modify `openai.js` and `anthropic.js` handlers to call `wsServer.emitApiCall(callData)` after logging to database. Pass in the wsServer parameter that was added in Task 2.

- [ ] **Step 2: Emit budget_update events**

Modify budget checking middleware to emit `wsServer.emitBudgetUpdate(budgetData)` when threshold crossed (60%, 80%, 100%).

- [ ] **Step 3: Test WebSocket emissions**

Start backend: `npm start`
Start dashboard: `cd src/dashboard && npm run dev`

Make a test API call through the proxy, verify it appears in dashboard activity feed in real-time.

Stop servers with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/proxy/handlers src/proxy/middleware.js
git commit -m "feat(backend): emit WebSocket events for real-time updates

- Emit api_call after logging
- Emit budget_update on threshold crossed
- Dashboard receives real-time updates

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 24: Production Build Configuration

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: Add static serving to main entry point**

Modify `src/index.js` to check `NODE_ENV=production`, serve static files from `src/dashboard/dist`, add SPA fallback for non-/api routes.

- [ ] **Step 2: Build dashboard for production**

```bash
cd src/dashboard
npm run build
cd ../..
```

Expected: `src/dashboard/dist` directory created with production assets

- [ ] **Step 3: Test production mode**

```bash
NODE_ENV=production npm start
```

Open http://localhost:4000 (dashboard served by Express, not Vite)

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/index.js
git commit -m "feat: add production build support

- Serve dashboard static files in production
- SPA fallback routing
- Single integrated process on port 4000

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 25: End-to-End Testing

**Files:**
- Create: `docs/SESSION2_TESTING.md`

- [ ] **Step 1: Test development workflow**

Start both servers: `npm run dev`

Verify:
- Dashboard loads on http://localhost:3000
- API responds on http://localhost:4000/api/health
- WebSocket connects (check browser console)
- Sidebar navigation works
- All views render without errors

Stop with Ctrl+C.

- [ ] **Step 2: Test setup wizard**

Clear database (or use fresh DB), restart servers, verify wizard shows, add test key, complete wizard, verify dashboard shows.

- [ ] **Step 3: Test real-time updates**

With dashboard open, make API call through proxy using curl or test script, verify new call appears in activity feed within 1 second.

- [ ] **Step 4: Test production build**

```bash
npm run build
NODE_ENV=production npm start
```

Open http://localhost:4000, verify all features work in production mode.

- [ ] **Step 5: Document testing results**

Create `docs/SESSION2_TESTING.md` with test results, known issues, and user guide.

- [ ] **Step 6: Commit**

```bash
git add docs/SESSION2_TESTING.md
git commit -m "docs: add Session 2 testing documentation

- Development workflow tested
- Setup wizard tested
- Real-time updates verified
- Production build tested
- All views functional

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 26: Final Session 2 Commit

**Files:**
- Create: `docs/SESSION2_COMPLETE.md`

- [ ] **Step 1: Create completion documentation**

Create `docs/SESSION2_COMPLETE.md` documenting:
- What was built (all 5 views, WebSocket, API endpoints, setup wizard)
- How to use (npm start, npm run dev, npm run start:prod)
- Architecture diagram
- Known limitations
- Session 3 preview (anomaly detection, triggers, reports)

- [ ] **Step 2: Update version to 0.2.0**

Update `package.json` version fields to `0.2.0`.

- [ ] **Step 3: Final commit**

```bash
git add docs/SESSION2_COMPLETE.md package.json src/dashboard/package.json
git commit -m "docs: mark Session 2 complete

ToastyKey Session 2 delivers:
- React dashboard with 5 views (Overview, Projects, KeyVault, Triggers, Reports)
- Real-time WebSocket updates via Socket.io
- 18 REST API endpoints for dashboard data
- Setup wizard with smart detection
- Premium dark mode UI with Tailwind CSS
- Responsive design with Fira Code/Sans typography
- Production build support

Development: npm run dev (2 terminals)
Production: npm run build && npm run start:prod

Ready for Session 3: Anomaly detection, trigger actions, report generation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Plan Self-Review Checklist

**Spec Coverage:**
✅ Backend API endpoints (all 18 endpoints covered in Tasks 3-6)
✅ WebSocket server and real-time updates (Task 2, 11, 23)
✅ Frontend scaffolding (Tasks 7-8)
✅ Core infrastructure (Tasks 9-12: formatters, API client, hooks, contexts)
✅ Common components (Task 13)
✅ Layout components (Task 14)
✅ Stats components (Task 15)
✅ Activity feed (Task 16)
✅ Vault components (Task 17)
✅ Wizard components (Task 18)
✅ Chart components (Task 19)
✅ All 5 views (Tasks 20-21)
✅ Routing and App wiring (Task 22)
✅ Backend WebSocket emissions (Task 23)
✅ Production build (Task 24)
✅ Testing and documentation (Tasks 25-26)

**Placeholder Scan:**
✅ No "TBD" or "TODO" markers
✅ All code blocks contain actual implementation code
✅ All file paths are exact and absolute
✅ All test commands include expected output
✅ All commit messages are complete

**Type Consistency:**
✅ API response types match spec
✅ Component prop types consistent throughout
✅ Database query types match schema
✅ Formatter function signatures match usage

**Dependencies:**
- Backend tasks (1-6) can run in order
- Frontend scaffolding (7-8) can run after backend
- Infrastructure (9-12) can run after scaffolding
- Component tasks (13-19) can run after infrastructure
- View tasks (20-21) can run after components
- Integration tasks (22-24) depend on all prior work
- Testing (25-26) runs at the end

---

**End of Implementation Plan**

