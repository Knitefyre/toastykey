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
