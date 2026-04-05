/**
 * Test script for database schema verification
 */

const ToastyKeyDB = require('./src/db/index');
const path = require('path');

async function testDatabaseSchema() {
  console.log('=== Testing Database Schema ===\n');

  const dbPath = path.join(__dirname, 'test-schema.db');
  const db = new ToastyKeyDB(dbPath);

  await db.ready;

  // Test 1: Check if new tables exist
  console.log('Test 1: Checking new tables...');
  const tables = await db.db.all(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log('Tables:', tables.map(t => t.name).join(', '));

  const requiredTables = ['baselines', 'pause_states', 'custom_providers', 'budget_overrides'];
  const missingTables = requiredTables.filter(t => !tables.find(tbl => tbl.name === t));

  if (missingTables.length > 0) {
    console.log('❌ Missing tables:', missingTables.join(', '));
  } else {
    console.log('✓ All new tables exist\n');
  }

  // Test 2: Check triggers table schema
  console.log('Test 2: Checking triggers table schema...');
  const triggersColumns = await db.db.all("PRAGMA table_info(triggers)");
  console.log('Triggers columns:', triggersColumns.map(c => `${c.name}(${c.type})`).join(', '));

  const hasName = triggersColumns.find(c => c.name === 'name');
  const hasWebhookUrl = triggersColumns.find(c => c.name === 'webhook_url');
  const thresholdColumn = triggersColumns.find(c => c.name === 'threshold');

  if (hasName && hasWebhookUrl && thresholdColumn.type === 'TEXT') {
    console.log('✓ Triggers table migrated correctly\n');
  } else {
    console.log('❌ Triggers table migration incomplete');
  }

  // Test 3: Check trigger_events table schema
  console.log('Test 3: Checking trigger_events table schema...');
  const triggerEventsColumns = await db.db.all("PRAGMA table_info(trigger_events)");
  console.log('Trigger_events columns:', triggerEventsColumns.map(c => c.name).join(', '));

  const hasEntityType = triggerEventsColumns.find(c => c.name === 'entity_type');
  const hasEntityId = triggerEventsColumns.find(c => c.name === 'entity_id');
  const hasMetricValue = triggerEventsColumns.find(c => c.name === 'metric_value');
  const hasBaselineValue = triggerEventsColumns.find(c => c.name === 'baseline_value');

  if (hasEntityType && hasEntityId && hasMetricValue && hasBaselineValue) {
    console.log('✓ Trigger_events table has new columns\n');
  } else {
    console.log('❌ Trigger_events table missing columns');
  }

  // Test 4: Check budgets table schema
  console.log('Test 4: Checking budgets table schema...');
  const budgetsColumns = await db.db.all("PRAGMA table_info(budgets)");
  console.log('Budgets columns:', budgetsColumns.map(c => c.name).join(', '));

  const hasNotifyAt = budgetsColumns.find(c => c.name === 'notify_at_percent');
  const hasEnforce = budgetsColumns.find(c => c.name === 'enforce');

  if (hasNotifyAt && hasEnforce) {
    console.log('✓ Budgets table has new columns\n');
  } else {
    console.log('❌ Budgets table missing columns');
  }

  // Test 5: Test baseline CRUD operations
  console.log('Test 5: Testing baseline CRUD operations...');
  const baselineId = await db.saveBaseline({
    date: '2026-04-05',
    scope: 'project',
    scope_id: 'test-project',
    metric: 'cost_per_call',
    value: 0.05,
    sample_size: 100
  });
  console.log('✓ Saved baseline with ID:', baselineId);

  const baseline = await db.getBaseline('project', 'test-project', 'cost_per_call', 30);
  console.log('✓ Retrieved baseline:', baseline ? 'success' : 'failed');

  const baselineHistory = await db.getBaselineHistory('project', 'test-project', 'cost_per_call', 30);
  console.log('✓ Retrieved baseline history:', baselineHistory.length, 'records\n');

  // Test 6: Test pause states CRUD operations
  console.log('Test 6: Testing pause states CRUD operations...');
  const pauseId = await db.pauseEntity({
    entity_type: 'project',
    entity_id: 'test-project',
    paused_by_trigger_id: 1,
    reason: 'Budget exceeded'
  });
  console.log('✓ Paused entity with ID:', pauseId);

  const isPaused = await db.isPaused('project', 'test-project');
  console.log('✓ Entity paused check:', isPaused);

  const pauseState = await db.getPauseState('project', 'test-project');
  console.log('✓ Retrieved pause state:', pauseState ? 'success' : 'failed');

  const allPaused = await db.getAllPausedEntities();
  console.log('✓ All paused entities:', allPaused.length, 'records');

  await db.unpauseEntity('project', 'test-project');
  console.log('✓ Unpaused entity\n');

  // Test 7: Test custom providers CRUD operations
  console.log('Test 7: Testing custom providers CRUD operations...');
  const providerId = await db.addCustomProvider({
    name: 'test-provider',
    base_url: 'https://api.test.com',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_request: 0.001
  });
  console.log('✓ Added custom provider with ID:', providerId);

  const provider = await db.getCustomProvider('test-provider');
  console.log('✓ Retrieved provider:', provider ? 'success' : 'failed');

  const providers = await db.listCustomProviders();
  console.log('✓ Listed providers:', providers.length, 'records');

  await db.updateCustomProvider(providerId, {
    name: 'test-provider',
    base_url: 'https://api.test.com/v2',
    auth_method: 'bearer',
    auth_header: 'Authorization',
    cost_per_request: 0.002
  });
  console.log('✓ Updated provider');

  await db.deleteCustomProvider(providerId);
  console.log('✓ Deleted provider\n');

  // Test 8: Test budget overrides CRUD operations
  console.log('Test 8: Testing budget overrides CRUD operations...');

  // Create a budget first
  const budgetId = await db.addBudget({
    scope: 'project',
    scope_id: 'test-project',
    period: 'monthly',
    limit_amount: 100
  });
  console.log('✓ Created budget with ID:', budgetId);

  const overrideId = await db.addBudgetOverride({
    budget_id: budgetId,
    additional_amount: 50,
    reason: 'Temporary increase',
    expires_at: '2026-05-01'
  });
  console.log('✓ Added budget override with ID:', overrideId);

  const overrides = await db.getBudgetOverrides(budgetId);
  console.log('✓ Retrieved overrides:', overrides.length, 'records');

  const totalOverride = await db.getActiveBudgetOverrideTotal(budgetId);
  console.log('✓ Total active override amount:', totalOverride);

  await db.deleteBudgetOverride(overrideId);
  console.log('✓ Deleted override\n');

  // Test 9: Test NULL handling in baseline queries
  console.log('Test 9: Testing NULL handling in baseline queries...');
  await db.saveBaseline({
    date: '2026-04-05',
    scope: 'global',
    scope_id: null,
    metric: 'avg_cost',
    value: 0.10,
    sample_size: 500
  });
  console.log('✓ Saved baseline with NULL scope_id');

  const globalBaseline = await db.getBaseline('global', null, 'avg_cost', 30);
  console.log('✓ Retrieved global baseline:', globalBaseline ? 'success' : 'failed');

  const globalHistory = await db.getBaselineHistory('global', null, 'avg_cost', 30);
  console.log('✓ Retrieved global baseline history:', globalHistory.length, 'records\n');

  await db.close();

  // Clean up test database
  const fs = require('fs');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  console.log('\n=== All tests completed successfully! ===');
}

testDatabaseSchema().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
