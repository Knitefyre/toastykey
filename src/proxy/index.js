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

    // API routes for dashboard
    const createStatsRouter = require('./api/stats');
    this.app.use('/api/stats', createStatsRouter(this.db));

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
