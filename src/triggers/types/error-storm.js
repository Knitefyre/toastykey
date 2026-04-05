async function check(db, trigger, baselines) {
  const threshold = JSON.parse(trigger.threshold);
  const { threshold_percent, min_sample_size, window_minutes } = threshold;

  let query = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors
    FROM api_calls
    WHERE timestamp >= datetime('now', '-${window_minutes} minutes')
  `;

  if (trigger.scope === 'provider' && trigger.scope_id) {
    query += ` AND provider = '${trigger.scope_id}'`;
  } else if (trigger.scope === 'project' && trigger.scope_id) {
    query += ` AND project = '${trigger.scope_id}'`;
  }

  const stats = await db.db.get(query);

  if (stats.total < min_sample_size) return null;

  const errorRate = (stats.errors / stats.total) * 100;

  if (errorRate > threshold_percent) {
    return {
      triggered: true,
      entity_type: trigger.scope === 'global' ? 'global' : trigger.scope,
      entity_id: trigger.scope_id,
      metric_value: stats.errors,
      baseline_value: threshold_percent,
      details: {
        error_rate: errorRate,
        threshold: threshold_percent,
        total_calls: stats.total,
        error_calls: stats.errors
      }
    };
  }

  return { triggered: false };
}

module.exports = { check };
