const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const WebSocketServer = require('./websocket');
const { detectProject, checkBudgets, checkPauseState } = require('./middleware');
const { AnomalyDetector } = require('../triggers');
const { BaselineCalculator, BaselineStorage } = require('../baselines');
const { ReportGenerator, ReportScheduler } = require('../reports');
const cron = require('node-cron');

class ProxyServer {
  constructor(database, vault, pricing, port = 4000) {
    this.db = database;
    this.vault = vault;
    this.pricing = pricing;
    this.port = port;

    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.wsServer = new WebSocketServer(this.httpServer);

    // Initialize subsystems
    this.baselines = new BaselineStorage(this.db);
    this.baselineCalculator = new BaselineCalculator(this.db);
    this.anomalyDetector = new AnomalyDetector(this.db, this.wsServer, this.baselines);
    this.reportGenerator = new ReportGenerator(this.db);
    this.reportScheduler = new ReportScheduler(this.db, this.reportGenerator);

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

    // Pause state checking
    this.app.use(checkPauseState(this.db));

    // Budget checking
    this.app.use(checkBudgets(this.db, this.wsServer));
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'toastykey-api',
        version: '0.3.0-session3a',
        uptime: process.uptime()
      });
    });

    // API routes for dashboard
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

    const createTriggersRouter = require('./api/triggers');
    this.app.use('/api/triggers', createTriggersRouter(this.db, this.wsServer));

    const createReportsRouter = require('./api/reports');
    this.app.use('/api/reports', createReportsRouter(this.db, this.reportGenerator));

    const createDataRouter = require('./api/data');
    this.app.use('/api/data', createDataRouter(this.db, this.reportGenerator));

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

    // Serve dashboard static files in production
    if (process.env.NODE_ENV === 'production') {
      const dashboardPath = path.join(__dirname, '../dashboard/dist');

      // Serve static assets
      this.app.use(express.static(dashboardPath));

      // SPA fallback - serve index.html for all non-API routes
      this.app.get('*', (req, res, next) => {
        // Skip API and proxy routes
        if (req.path.startsWith('/api/') || req.path.startsWith('/openai') || req.path.startsWith('/anthropic') || req.path === '/stats') {
          return next();
        }
        res.sendFile(path.join(dashboardPath, 'index.html'));
      });
    }

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

    // Additional provider handlers
    this.setupNewProviders();
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

  setupBudgetReset() {
    // Daily reset at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('[BudgetReset] Running daily budget reset');
      try {
        // Delete expired overrides
        await this.db.run(`DELETE FROM budget_overrides WHERE expires_at < datetime('now')`);

        // Reset daily budgets (nothing to do - they auto-reset based on queries)
        console.log('[BudgetReset] Daily reset complete');
      } catch (error) {
        console.error('[BudgetReset] Error:', error.message);
      }
    });

    // Weekly reset on Monday at midnight
    cron.schedule('0 0 * * 1', async () => {
      console.log('[BudgetReset] Running weekly budget reset');
    });

    // Monthly reset on 1st at midnight
    cron.schedule('0 0 1 * *', async () => {
      console.log('[BudgetReset] Running monthly budget reset');
    });
  }

  async start() {
    return new Promise(async (resolve) => {
      this.httpServer.listen(this.port, async () => {
        console.log(`Proxy + WebSocket running on http://localhost:${this.port}`);

        // Start subsystems
        await this.reportGenerator.initialize();
        this.baselineCalculator.start();
        this.anomalyDetector.start();
        this.reportScheduler.start({ auto_generate: false }); // Disable auto-generation by default
        this.setupBudgetReset();

        resolve();
      });
    });
  }

  stop() {
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
