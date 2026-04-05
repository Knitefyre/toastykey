async function check(db, trigger, baselines) {
  const threshold = JSON.parse(trigger.threshold);
  const { window_minutes = 1 } = threshold;

  // Get historical providers
  const historical = await db.all(`
    SELECT DISTINCT provider FROM api_calls
    WHERE timestamp < datetime('now', '-${window_minutes} minutes')
  `);

  const historicalProviders = new Set(historical.map(r => r.provider));

  // Check for new provider in recent window
  const recent = await db.all(`
    SELECT DISTINCT provider FROM api_calls
    WHERE timestamp >= datetime('now', '-${window_minutes} minutes')
  `);

  for (const { provider } of recent) {
    if (!historicalProviders.has(provider)) {
      return {
        triggered: true,
        entity_type: 'provider',
        entity_id: provider,
        metric_value: 1,
        baseline_value: 0,
        details: {
          new_provider: provider,
          window_minutes
        }
      };
    }
  }

  return { triggered: false };
}

module.exports = { check };
