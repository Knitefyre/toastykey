const { executeAction } = require('./actions');
const rateSpikeCheck = require('./types/rate-spike');
const costSpikeCheck = require('./types/cost-spike');
const errorStormCheck = require('./types/error-storm');
const tokenExplosionCheck = require('./types/token-explosion');
const silentDrainCheck = require('./types/silent-drain');
const newProviderCheck = require('./types/new-provider');

class AnomalyDetector {
  constructor(db, wsServer, baselines) {
    this.db = db;
    this.wsServer = wsServer;
    this.baselines = baselines;
    this.interval = null;

    this.triggerHandlers = {
      rate_spike: rateSpikeCheck,
      cost_spike: costSpikeCheck,
      error_storm: errorStormCheck,
      token_explosion: tokenExplosionCheck,
      silent_drain: silentDrainCheck,
      new_provider: newProviderCheck
    };
  }

  start() {
    console.log('[AnomalyDetector] Starting (30s interval)');
    // Run every 30 seconds
    this.interval = setInterval(() => this.check(), 30000);
    // Run immediately on start
    this.check();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[AnomalyDetector] Stopped');
    }
  }

  async check() {
    try {
      // 1. Load enabled triggers
      const triggers = await this.db.all(
        'SELECT * FROM triggers WHERE enabled = 1'
      );

      // 2. For each trigger, run detection
      for (const trigger of triggers) {
        const handler = this.triggerHandlers[trigger.trigger_type];
        if (!handler) {
          console.warn(`[AnomalyDetector] Unknown trigger type: ${trigger.trigger_type}`);
          continue;
        }

        const result = await handler.check(this.db, trigger, this.baselines);

        if (result && result.triggered) {
          // 3. Check cooldown
          if (await this.isCooledDown(trigger)) {
            // 4. Execute action
            await executeAction(this.db, this.wsServer, trigger, result);
            console.log(`[AnomalyDetector] Trigger fired: ${trigger.name} (${trigger.trigger_type})`);
          }
        }
      }
    } catch (error) {
      console.error('[AnomalyDetector] Check failed:', error.message);
    }
  }

  async isCooledDown(trigger) {
    const threshold = JSON.parse(trigger.threshold);
    const cooldown = threshold.cooldown_minutes || 10;

    const lastEvent = await this.db.get(
      `SELECT timestamp FROM trigger_events
       WHERE trigger_id = ?
       ORDER BY timestamp DESC LIMIT 1`,
      [trigger.id]
    );

    if (!lastEvent) return true;

    const minutesSince = (Date.now() - new Date(lastEvent.timestamp)) / 60000;
    return minutesSince >= cooldown;
  }
}

module.exports = AnomalyDetector;
