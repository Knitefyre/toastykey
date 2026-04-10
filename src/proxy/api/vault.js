const express = require('express');
const router = express.Router();

function createVaultRouter(db, vault, wsServer) {
  // GET /api/vault/keys - List all keys (metadata only)
  router.get('/keys', async (req, res) => {
    try {
      const keys = await vault.listKeys();

      // Enrich each key with usage stats and status
      const enrichedKeys = await Promise.all(keys.map(async (key) => {
        // Get usage stats from api_calls table
        const usage = await db.db.get(`
          SELECT
            COUNT(*) as call_count,
            SUM(cost_inr) as total_cost,
            MAX(timestamp) as last_used,
            MAX(CASE WHEN status_code BETWEEN 200 AND 299 THEN timestamp END) as last_success,
            MAX(CASE WHEN status_code IN (401, 403) THEN timestamp END) as last_auth_error
          FROM api_calls
          WHERE api_key_id = ?
        `, [key.id]);

        // Determine status
        let status = 'active';
        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

        if (usage.last_auth_error) {
          const lastAuthErrorTime = new Date(usage.last_auth_error).getTime();
          // If last auth error is more recent than last success, mark as expired
          if (!usage.last_success || new Date(usage.last_success).getTime() < lastAuthErrorTime) {
            status = 'expired';
          }
        } else if (!usage.last_used || new Date(usage.last_used).getTime() < thirtyDaysAgo) {
          status = 'unused';
        }

        return {
          ...key,
          status,
          usage: {
            call_count: usage.call_count || 0,
            total_cost: usage.total_cost || 0,
            last_used: usage.last_used
          }
        };
      }));

      res.json({ keys: enrichedKeys });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/vault/keys - Add a new key
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

  // DELETE /api/vault/keys/:id - Delete a key
  router.delete('/keys/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          error: 'Invalid key ID'
        });
      }

      const success = await vault.deleteKey(parseInt(id));

      if (success) {
        // Emit WebSocket event
        wsServer.emitVaultUpdate('deleted', {
          key_id: parseInt(id)
        });

        res.json({
          success: true,
          message: `Key ${id} deleted successfully`
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Key not found or could not be deleted'
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/vault/keys/:id/reveal - Reveal a key (decrypted for 10 seconds)
  router.post('/keys/:id/reveal', async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          error: 'Invalid key ID'
        });
      }

      const decryptedKey = await vault.getKeyById(parseInt(id));

      if (!decryptedKey) {
        return res.status(404).json({
          success: false,
          error: 'Key not found'
        });
      }

      res.json({
        success: true,
        key: decryptedKey,
        expires_in: 10000 // milliseconds
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/vault/import-env - Import keys from .env file content
  router.post('/import-env', async (req, res) => {
    try {
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          error: 'Missing content field',
          expected: { content: 'OPENAI_API_KEY=sk-...' }
        });
      }

      const found_keys = [];
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Parse KEY=value format
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex === -1) continue;

        const envKey = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();

        // Skip empty values
        if (!value) continue;

        // Detect OpenAI keys
        if (envKey.includes('OPENAI') && value.startsWith('sk-')) {
          found_keys.push({
            provider: 'openai',
            label: 'default',
            key: value
          });
        }
        // Detect Anthropic keys
        else if (envKey.includes('ANTHROPIC') && value.startsWith('sk-ant-')) {
          found_keys.push({
            provider: 'anthropic',
            label: 'default',
            key: value
          });
        }
      }

      res.json({
        found_keys
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createVaultRouter;
