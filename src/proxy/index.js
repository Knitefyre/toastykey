const express = require('express');
const cors = require('cors');
const { detectProject, checkBudgets } = require('./middleware');

class ProxyServer {
  constructor(database, vault, pricing, port = 4000) {
    this.db = database;
    this.vault = vault;
    this.pricing = pricing;
    this.port = port;

    this.app = express();
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
        version: '0.1.0',
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

    // Provider proxy routes will be added in next tasks
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Proxy running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }
}

module.exports = ProxyServer;
