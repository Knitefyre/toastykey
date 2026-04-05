async function check(db, trigger, baselines) {
  const threshold = JSON.parse(trigger.threshold);
  const { window_minutes = 10 } = threshold;

  let query = `
    SELECT COUNT(*) as count
    FROM api_calls
    WHERE timestamp >= datetime('now', '-${window_minutes} minutes')
    AND session_id IS NULL
  `;

  if (trigger.scope === 'provider' && trigger.scope_id) {
    query += ` AND provider = '${trigger.scope_id}'`;
  } else if (trigger.scope === 'project' && trigger.scope_id) {
    query += ` AND project = '${trigger.scope_id}'`;
  }

  const result = await db.db.get(query);

  if (result.count > 0) {
    return {
      triggered: true,
      entity_type: trigger.scope === 'global' ? 'global' : trigger.scope,
      entity_id: trigger.scope_id,
      metric_value: result.count,
      baseline_value: 0,
      details: {
        unsessioned_calls: result.count,
        window_minutes
      }
    };
  }

  return { triggered: false };
}

module.exports = { check };
