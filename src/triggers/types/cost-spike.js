async function check(db, trigger, baselines) {
  const threshold = JSON.parse(trigger.threshold);
  const { multiplier, window_minutes, min_sample_size } = threshold;

  let query = `
    SELECT SUM(cost_usd) as cost
    FROM api_calls
    WHERE timestamp >= datetime('now', '-${window_minutes} minutes')
  `;

  if (trigger.scope === 'provider' && trigger.scope_id) {
    query += ` AND provider = '${trigger.scope_id}'`;
  } else if (trigger.scope === 'project' && trigger.scope_id) {
    query += ` AND project = '${trigger.scope_id}'`;
  }

  const currentCost = await db.get(query);

  const baseline = await baselines.getCost(
    trigger.scope,
    trigger.scope_id
  );

  if (!baseline || baseline.sample_size < min_sample_size) {
    return null;
  }

  const costThisWindow = currentCost.cost || 0;
  const normalCost = baseline.value * (window_minutes / 60);

  if (costThisWindow > normalCost * multiplier) {
    return {
      triggered: true,
      entity_type: trigger.scope === 'global' ? 'global' : trigger.scope,
      entity_id: trigger.scope_id,
      metric_value: costThisWindow,
      baseline_value: normalCost,
      details: {
        current_cost: costThisWindow,
        normal_cost: normalCost,
        multiplier_exceeded: costThisWindow / normalCost,
        window_minutes
      }
    };
  }

  return { triggered: false };
}

module.exports = { check };
