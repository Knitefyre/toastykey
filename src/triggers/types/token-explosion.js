async function check(db, trigger, baselines) {
  const threshold = JSON.parse(trigger.threshold);
  const { multiplier, min_sample_size } = threshold;

  const baseline = await baselines.getTokenAverage(
    trigger.scope,
    trigger.scope_id
  );

  if (!baseline || baseline.sample_size < min_sample_size) {
    return null;
  }

  const tokenThreshold = baseline.value * multiplier;

  let query = `
    SELECT id, (input_tokens + output_tokens) as total_tokens, model
    FROM api_calls
    WHERE timestamp >= datetime('now', '-5 minutes')
    AND (input_tokens + output_tokens) > ${tokenThreshold}
  `;

  if (trigger.scope === 'provider' && trigger.scope_id) {
    query += ` AND provider = '${trigger.scope_id}'`;
  } else if (trigger.scope === 'project' && trigger.scope_id) {
    query += ` AND project = '${trigger.scope_id}'`;
  }

  query += ` ORDER BY total_tokens DESC LIMIT 1`;

  const explosiveCall = await db.db.get(query);

  if (explosiveCall) {
    return {
      triggered: true,
      entity_type: trigger.scope === 'global' ? 'global' : trigger.scope,
      entity_id: trigger.scope_id,
      metric_value: explosiveCall.total_tokens,
      baseline_value: baseline.value,
      details: {
        call_id: explosiveCall.id,
        tokens: explosiveCall.total_tokens,
        model: explosiveCall.model,
        average_tokens: baseline.value,
        multiplier_exceeded: explosiveCall.total_tokens / baseline.value
      }
    };
  }

  return { triggered: false };
}

module.exports = { check };
