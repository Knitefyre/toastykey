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
