/**
 * Demo Data Generator for ToastyKey
 * Populates database with realistic fake data for demos
 */

const crypto = require('crypto');

const PROVIDERS = ['openai', 'anthropic', 'elevenlabs', 'stability'];
const PROJECTS = [
  { name: 'my-saas-app', path: '/Users/demo/projects/my-saas-app' },
  { name: 'spazi-website', path: '/Users/demo/projects/spazi-website' },
  { name: 'jebbee-pipeline', path: '/Users/demo/projects/jebbee-pipeline' },
  { name: 'toastykey-dev', path: '/Users/demo/projects/toastykey-dev' },
  { name: 'side-project', path: '/Users/demo/projects/side-project' }
];

const MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'dall-e-3'],
  anthropic: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku-4'],
  elevenlabs: ['eleven_multilingual_v2'],
  stability: ['stable-diffusion-xl']
};

const ENDPOINTS = {
  openai: ['/v1/chat/completions', '/v1/images/generations'],
  anthropic: ['/v1/messages'],
  elevenlabs: ['/v1/text-to-speech'],
  stability: ['/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image']
};

// Cost ranges per provider (INR)
const COST_RANGES = {
  openai: { min: 0.05, max: 15 },
  anthropic: { min: 0.1, max: 20 },
  elevenlabs: { min: 0.5, max: 5 },
  stability: { min: 1, max: 8 }
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo) {
  const now = Date.now();
  const offset = Math.random() * daysAgo * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
}

async function generateDemoData(db, vault) {
  console.log('[DemoMode] Generating demo data...\n');

  // 1. Generate API Keys
  console.log('[DemoMode] Adding API keys...');
  const keyIds = {};

  for (const provider of PROVIDERS) {
    const fakeKey = `sk-${provider}-${crypto.randomBytes(16).toString('hex')}`;
    const result = await vault.addKey(provider, 'demo', fakeKey);
    if (result.success) {
      keyIds[provider] = result.id;
      console.log(`  ✓ ${provider}: key_id=${result.id}`);
    }
  }

  // 2. Generate Projects
  console.log('\n[DemoMode] Creating projects...');
  const projectIds = {};

  for (const proj of PROJECTS) {
    await db.run(
      'INSERT INTO projects (name, path, type, auto_detected, detected_at) VALUES (?, ?, ?, ?, ?)',
      [proj.name, proj.path, 'node', 1, new Date().toISOString()]
    );
    const result = await db.db.get('SELECT last_insert_rowid() as id');
    projectIds[proj.name] = result.id;
    console.log(`  ✓ ${proj.name}: project_id=${result.id}`);
  }

  // 3. Generate API Calls (500 calls over 30 days)
  console.log('\n[DemoMode] Generating 500 API calls over 30 days...');
  const providerWeights = { openai: 0.6, anthropic: 0.25, elevenlabs: 0.10, stability: 0.05 };

  for (let i = 0; i < 500; i++) {
    // Pick provider based on weights
    const rand = Math.random();
    let provider;
    if (rand < 0.6) provider = 'openai';
    else if (rand < 0.85) provider = 'anthropic';
    else if (rand < 0.95) provider = 'elevenlabs';
    else provider = 'stability';

    const project = randomChoice(PROJECTS);
    const model = randomChoice(MODELS[provider]);
    const endpoint = randomChoice(ENDPOINTS[provider]);
    const costRange = COST_RANGES[provider];
    const cost = randomFloat(costRange.min, costRange.max);
    const timestamp = randomDate(30).toISOString();

    const inputTokens = provider === 'openai' || provider === 'anthropic' ? randomInt(100, 5000) : null;
    const outputTokens = provider === 'openai' || provider === 'anthropic' ? randomInt(50, 2000) : null;
    const statusCode = Math.random() < 0.98 ? 200 : (Math.random() < 0.5 ? 401 : 500);

    await db.logApiCall({
      provider,
      endpoint,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost / 85,
      cost_inr: cost,
      status_code: statusCode,
      api_key_id: keyIds[provider],
      project: project.path,
      timestamp
    });

    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/500 calls generated`);
    }
  }
  console.log('  ✓ 500 API calls generated');

  // 4. Generate Budgets
  console.log('\n[DemoMode] Creating budgets...');
  await db.run(
    'INSERT INTO budgets (scope, scope_id, period, limit_amount, current_spend, currency) VALUES (?, ?, ?, ?, ?, ?)',
    ['global', null, 'daily', 500, randomFloat(100, 400), 'INR']
  );
  console.log('  ✓ Global daily budget: ₹500');

  await db.run(
    'INSERT INTO budgets (scope, scope_id, period, limit_amount, current_spend, currency) VALUES (?, ?, ?, ?, ?, ?)',
    ['provider', 'openai', 'monthly', 5000, randomFloat(2000, 4500), 'INR']
  );
  console.log('  ✓ OpenAI monthly budget: ₹5000');

  // 5. Generate Triggers
  console.log('\n[DemoMode] Creating triggers...');
  await db.run(
    `INSERT INTO triggers (name, scope, scope_id, trigger_type, threshold, action, webhook_url, enabled, cooldown_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'Global Rate Spike',
      'global',
      null,
      'rate_spike',
      JSON.stringify({ multiplier: 5, window_minutes: 2, min_sample_size: 5 }),
      'dashboard_notify',
      null,
      1,
      10
    ]
  );
  console.log('  ✓ Rate spike trigger (global)');

  await db.run(
    `INSERT INTO triggers (name, scope, scope_id, trigger_type, threshold, action, webhook_url, enabled, cooldown_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'OpenAI Cost Spike',
      'provider',
      'openai',
      'cost_spike',
      JSON.stringify({ multiplier: 3, window_minutes: 60, min_sample_size: 5 }),
      'auto_pause',
      null,
      1,
      30
    ]
  );
  console.log('  ✓ Cost spike trigger (openai)');

  await db.run(
    `INSERT INTO triggers (name, scope, scope_id, trigger_type, threshold, action, webhook_url, enabled, cooldown_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'Global Error Storm',
      'global',
      null,
      'error_storm',
      JSON.stringify({ threshold_percent: 50, min_sample_size: 10, window_minutes: 10 }),
      'dashboard_notify',
      null,
      1,
      15
    ]
  );
  console.log('  ✓ Error storm trigger (global)');

  // 6. Generate Trigger Events (last 7 days)
  console.log('\n[DemoMode] Creating trigger events...');
  for (let i = 0; i < 5; i++) {
    const triggerId = randomInt(1, 3);
    const timestamp = randomDate(7).toISOString();

    await db.run(
      `INSERT INTO trigger_events (trigger_id, detected_at, trigger_type, scope, scope_id, metric_value, baseline_value, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        triggerId,
        timestamp,
        'cost_spike',
        'global',
        null,
        randomFloat(500, 1000),
        randomFloat(100, 200),
        `Cost spike detected: ₹${randomInt(500, 1000)} (3x baseline)`
      ]
    );
  }
  console.log('  ✓ 5 trigger events generated');

  // 7. Generate Reports
  console.log('\n[DemoMode] Creating reports...');
  const weeklyReport = {
    total_inr: randomFloat(3000, 5000),
    total_usd: randomFloat(35, 60),
    call_count: randomInt(400, 600),
    by_provider: {
      openai: randomFloat(1800, 3000),
      anthropic: randomFloat(750, 1250),
      elevenlabs: randomFloat(300, 500)
    }
  };

  await db.run(
    `INSERT INTO reports (name, type, start_date, end_date, data, generated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'Weekly Report',
      'weekly',
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString(),
      JSON.stringify(weeklyReport),
      new Date().toISOString()
    ]
  );
  console.log('  ✓ Weekly report');

  const monthlyReport = {
    total_inr: randomFloat(12000, 18000),
    total_usd: randomFloat(140, 210),
    call_count: randomInt(1500, 2500),
    by_provider: {
      openai: randomFloat(7200, 10800),
      anthropic: randomFloat(3000, 4500),
      elevenlabs: randomFloat(1200, 1800)
    }
  };

  await db.run(
    `INSERT INTO reports (name, type, start_date, end_date, data, generated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'Monthly Report',
      'monthly',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString(),
      JSON.stringify(monthlyReport),
      new Date().toISOString()
    ]
  );
  console.log('  ✓ Monthly report');

  console.log('\n[DemoMode] ✅ Demo data generation complete!\n');
  console.log('Open http://localhost:3000 to view the dashboard');
}

module.exports = { generateDemoData };
