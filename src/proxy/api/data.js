const express = require('express');
const router = express.Router();

const PROVIDERS = ['openai', 'anthropic', 'elevenlabs', 'stability'];
const PROJECTS = ['my-saas-app', 'spazi-website', 'side-project', 'toastykey-dev', 'jebbee-pipeline'];
const MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'dall-e-3'],
  anthropic: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku-4'],
  elevenlabs: ['eleven_multilingual_v2', 'eleven_flash_v2'],
  stability: ['stable-diffusion-xl', 'stable-diffusion-3'],
};
const ENDPOINTS = {
  openai: ['/v1/chat/completions', '/v1/images/generations', '/v1/audio/speech'],
  anthropic: ['/v1/messages'],
  elevenlabs: ['/v1/text-to-speech'],
  stability: ['/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image'],
};
const USD_TO_INR = 85.1;

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function createDataRouter(db, reportGenerator) {
  // GET /api/data/stats - count existing data
  router.get('/stats', async (req, res) => {
    try {
      const stats = await db.db.get(
        'SELECT COUNT(*) as total_calls, MIN(timestamp) as oldest, MAX(timestamp) as newest FROM api_calls'
      );
      res.json({ success: true, ...stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/data/clear - delete api_calls within a date range
  router.post('/clear', async (req, res) => {
    try {
      const { start_date, end_date } = req.body;
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'start_date and end_date are required' });
      }
      const result = await db.db.run(
        'DELETE FROM api_calls WHERE timestamp BETWEEN ? AND ?',
        [start_date, end_date]
      );
      res.json({ success: true, deleted: result.changes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/data/demo - generate 7 days of demo data + sample report
  router.post('/demo', async (req, res) => {
    try {
      const { force } = req.body;

      // Check existing data
      const existing = await db.db.get('SELECT COUNT(*) as count FROM api_calls');
      if (existing.count > 0 && !force) {
        return res.status(409).json({
          error: 'Data already exists',
          existing_count: existing.count,
          requires_force: true
        });
      }

      // Ensure projects exist
      for (const name of PROJECTS) {
        await db.db.run(
          'INSERT OR IGNORE INTO projects (name, directory_path) VALUES (?, ?)',
          [name, `/Users/demo/projects/${name}`]
        );
      }

      // Generate 7 days of api_calls
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      let callsInserted = 0;

      for (let day = 0; day < 7; day++) {
        const dayStart = new Date(sevenDaysAgo.getTime() + day * 24 * 60 * 60 * 1000);
        const callsToday = randomInt(60, 110);

        for (let i = 0; i < callsToday; i++) {
          const provider = pick(PROVIDERS);
          const model = pick(MODELS[provider]);
          const endpoint = pick(ENDPOINTS[provider]);
          const project = pick(PROJECTS);
          const timestamp = new Date(dayStart.getTime() + Math.random() * 24 * 60 * 60 * 1000);
          const isTokenProvider = provider === 'openai' || provider === 'anthropic';
          const input_tokens = isTokenProvider ? randomInt(100, 5000) : null;
          const output_tokens = isTokenProvider ? randomInt(50, 2000) : null;
          const cost_usd = randomFloat(0.001, 0.25);
          const cost_inr = cost_usd * USD_TO_INR;
          const status = Math.random() < 0.04 ? (Math.random() < 0.5 ? 429 : 500) : 200;
          const latency_ms = randomInt(200, 3000);

          await db.db.run(
            `INSERT INTO api_calls
              (timestamp, provider, endpoint, project, model, input_tokens, output_tokens, cost_usd, cost_inr, status, latency_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              timestamp.toISOString().replace('T', ' ').substring(0, 19),
              provider, endpoint, project, model,
              input_tokens, output_tokens,
              cost_usd, cost_inr,
              status, latency_ms
            ]
          );
          callsInserted++;
        }
      }

      // Also ensure api_keys exist for demo providers
      const demoProviders = [
        { provider: 'openai',    label: 'demo', key: 'sk-demo-openai-key-toastykey' },
        { provider: 'anthropic', label: 'demo', key: 'sk-ant-demo-anthropic-key-toastykey' },
        { provider: 'elevenlabs',label: 'demo', key: 'demo-elevenlabs-key-toastykey' },
        { provider: 'stability', label: 'demo', key: 'demo-stability-key-toastykey' },
      ];

      // Generate a sample weekly report
      let report_id = null;
      if (reportGenerator) {
        try {
          const start = sevenDaysAgo.toISOString();
          const end = now.toISOString();
          const { html, json, report } = await reportGenerator.generateReport('weekly', start, end);
          const saved = await reportGenerator.saveReport(report, html, json);
          report_id = saved.report_id;
        } catch (reportErr) {
          console.warn('[data/demo] report generation failed (non-fatal):', reportErr.message);
        }
      }

      res.json({
        success: true,
        calls_generated: callsInserted,
        report_id,
        message: `Generated ${callsInserted} demo API calls over 7 days${report_id ? ' + sample weekly report' : ''}`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createDataRouter;
