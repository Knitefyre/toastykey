const express = require('express');
const router = express.Router();

function createVaultRouter(db, vault, wsServer) {
  // GET /api/vault/keys - List all keys (metadata only)
  router.get('/keys', async (req, res) => {
    try {
      const keys = await vault.listKeys();
      res.json({ keys });
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

  // POST /api/vault/import-env - Import keys from environment variables
  router.post('/import-env', async (req, res) => {
    try {
      const { envVars } = req.body;

      if (!envVars || typeof envVars !== 'object') {
        return res.status(400).json({
          error: 'Invalid request body',
          expected: { envVars: { PROVIDER_LABEL: 'key_value' } }
        });
      }

      const results = {
        success: [],
        failed: []
      };

      for (const [envKey, value] of Object.entries(envVars)) {
        // Skip empty values
        if (!value || typeof value !== 'string') {
          results.failed.push({
            key: envKey,
            reason: 'Empty or invalid value'
          });
          continue;
        }

        // Parse environment variable name (e.g., OPENAI_API_KEY -> provider: openai, label: api_key)
        const parts = envKey.toLowerCase().split('_');

        // Try to detect provider from key name
        let provider = 'unknown';
        let label = envKey.toLowerCase();

        if (envKey.includes('OPENAI')) {
          provider = 'openai';
          label = parts.slice(1).join('_') || 'default';
        } else if (envKey.includes('ANTHROPIC')) {
          provider = 'anthropic';
          label = parts.slice(1).join('_') || 'default';
        } else if (envKey.includes('GOOGLE')) {
          provider = 'google';
          label = parts.slice(1).join('_') || 'default';
        } else {
          // Use first part as provider
          provider = parts[0] || 'unknown';
          label = parts.slice(1).join('_') || 'default';
        }

        const result = await vault.addKey(provider, label, value);

        if (result.success) {
          results.success.push({
            key: envKey,
            provider,
            label,
            id: result.id
          });

          // Emit WebSocket event
          wsServer.emitVaultUpdate('added', {
            provider,
            label,
            key_id: result.id
          });
        } else {
          results.failed.push({
            key: envKey,
            reason: result.error
          });
        }
      }

      res.json({
        success: true,
        imported: results.success.length,
        failed: results.failed.length,
        details: results
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createVaultRouter;
