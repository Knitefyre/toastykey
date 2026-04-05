const axios = require('axios');

async function executeAction(db, wsServer, trigger, event) {
  // 1. Log event
  const result = await db.run(`
    INSERT INTO trigger_events (
      trigger_id, entity_type, entity_id,
      metric_value, baseline_value, details, action_taken
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    trigger.id,
    event.entity_type,
    event.entity_id,
    event.metric_value,
    event.baseline_value,
    JSON.stringify(event.details),
    trigger.action
  ]);

  const eventId = result.lastID;

  // 2. Execute action
  const actions = {
    log_only: async () => {
      // Already logged above
    },

    dashboard_notify: async () => {
      wsServer.emit('anomaly_detected', {
        trigger_id: trigger.id,
        event_id: eventId,
        type: trigger.trigger_type,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        details: event.details,
        timestamp: new Date().toISOString()
      });
    },

    claude_code_alert: async () => {
      // Flag for MCP tool
      await db.run(`
        UPDATE trigger_events
        SET action_taken = 'claude_code_alert_pending'
        WHERE id = ?
      `, [eventId]);
    },

    auto_pause: async () => {
      await db.run(`
        INSERT OR REPLACE INTO pause_states
        (entity_type, entity_id, paused_by_trigger_id, reason)
        VALUES (?, ?, ?, ?)
      `, [event.entity_type, event.entity_id, eventId, 'auto_pause']);

      wsServer.emit('entity_paused', {
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        reason: 'auto_pause',
        trigger_type: trigger.trigger_type
      });
    },

    auto_kill: async () => {
      await db.run(`
        INSERT OR REPLACE INTO pause_states
        (entity_type, entity_id, paused_by_trigger_id, reason)
        VALUES (?, ?, ?, ?)
      `, [event.entity_type, event.entity_id, eventId, 'auto_kill']);

      wsServer.emit('entity_paused', {
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        reason: 'auto_kill',
        trigger_type: trigger.trigger_type
      });
    },

    webhook: async () => {
      try {
        await axios.post(trigger.webhook_url, {
          trigger_id: trigger.id,
          event_id: eventId,
          type: trigger.trigger_type,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          details: event.details,
          timestamp: new Date().toISOString()
        }, {
          timeout: 5000
        });
      } catch (error) {
        console.error('[Actions] Webhook failed:', error.message);
      }
    }
  };

  await actions[trigger.action]();
}

module.exports = { executeAction };
