const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

function createSetupRouter(db) {
  // GET /api/setup/status - Check if setup needed
  router.get('/status', async (req, res) => {
    try {
      // Check if any keys exist
      const keys = await db.db.get('SELECT COUNT(*) as count FROM api_keys');
      const hasKeys = keys.count > 0;

      // Check if any API calls have been made
      const calls = await db.db.get('SELECT COUNT(*) as count FROM api_calls');
      const hasCalls = calls.count > 0;

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
