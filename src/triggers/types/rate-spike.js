async function check(db, trigger, baselines) {
  const threshold = JSON.parse(trigger.threshold);
  const { multiplier, window_minutes, min_sample_size } = threshold;

  let query = `
    SELECT COUNT(*) as calls
    FROM api_calls
    WHERE timestamp >= datetime('now', '-${window_minutes} minutes')
  `;

  if (trigger.scope === 'provider' && trigger.scope_id) {
    query += ` AND provider = '${trigger.scope_id}'`;
  } else if (trigger.scope === 'project' && trigger.scope_id) {
    query += ` AND project = '${trigger.scope_id}'`;
  }

  const currentRate = await db.db.get(query);

  const baseline = await baselines.getRate(
    trigger.scope,
    trigger.scope_id,
    window_minutes
  );

  if (!baseline || baseline.sample_size < min_sample_size) {
    return null;
  }

  const callsPerMinute = currentRate.calls / window_minutes;
  const normalRate = baseline.value;

  if (callsPerMinute > normalRate * multiplier) {
    return {
      triggered: true,
      entity_type: trigger.scope === 'global' ? 'global' : trigger.scope,
      entity_id: trigger.scope_id,
      metric_value: callsPerMinute,
      baseline_value: normalRate,
      details: {
        current_rate: callsPerMinute,
        normal_rate: normalRate,
        multiplier_exceeded: callsPerMinute / normalRate,
        window_minutes
      }
    };
  }

  return { triggered: false };
}

module.exports = { check };
