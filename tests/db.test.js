const Database = require('../src/db');
const fs = require('fs');
const path = require('path');

const TEST_DB = path.join(__dirname, 'test.db');

describe('Database', () => {
  let db;

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    db = new Database(TEST_DB);
    await db.ready;
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  test('initializes database with all tables', async () => {
    // Query to get all table names from sqlite_master
    const tables = await db.db.all(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );

    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('api_calls');
    expect(tableNames).toContain('api_keys');
    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('budgets');
    expect(tableNames).toContain('triggers');
    expect(tableNames).toContain('trigger_events');
    expect(tableNames).toContain('reports');
  });

  test('logs API call and retrieves it', async () => {
    const callData = {
      provider: 'openai',
      endpoint: '/v1/chat/completions',
      model: 'gpt-4',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.015,
      cost_inr: 1.275
    };

    const id = await db.logApiCall(callData);
    expect(id).toBeGreaterThan(0);

    const calls = await db.getApiCalls({ provider: 'openai' });
    expect(calls.length).toBe(1);
    expect(calls[0].model).toBe('gpt-4');
    expect(calls[0].input_tokens).toBe(100);
  });

  test('manages API keys', async () => {
    const keyData = {
      provider: 'anthropic',
      label: 'default',
      encrypted_key: 'encrypted_data',
      iv: 'init_vector',
      auth_tag: 'auth_tag_data'
    };

    const id = await db.addApiKey(keyData);
    expect(id).toBeGreaterThan(0);

    const key = await db.getApiKey('anthropic', 'default');
    expect(key).toBeDefined();
    expect(key.provider).toBe('anthropic');
    expect(key.label).toBe('default');

    const keys = await db.listApiKeys();
    expect(keys.length).toBe(1);

    await db.deleteApiKey(id);
    const deletedKey = await db.getApiKey('anthropic', 'default');
    expect(deletedKey).toBeUndefined();
  });

  test('manages projects', async () => {
    const projectId = await db.addProject('test-project', '/path/to/project');
    expect(projectId).toBeGreaterThan(0);

    const project = await db.getProject('/path/to/project');
    expect(project).toBeDefined();
    expect(project.name).toBe('test-project');

    const allProjects = await db.getAllProjects();
    expect(allProjects.length).toBe(1);
  });

  test('manages sessions', async () => {
    const projectId = await db.addProject('session-test', '/path/to/session');
    const sessionId = await db.createSession(projectId, 'claude');
    expect(sessionId).toBeGreaterThan(0);

    await db.endSession(sessionId);
    const session = await db.db.get('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    expect(session.ended_at).toBeTruthy();
  });

  test('manages budgets', async () => {
    const budgetData = {
      scope: 'global',
      scope_id: null,
      period: 'monthly',
      limit_amount: 100.00
    };

    const budgetId = await db.addBudget(budgetData);
    expect(budgetId).toBeGreaterThan(0);

    const budget = await db.getBudget('global', null, 'monthly');
    expect(budget).toBeDefined();
    expect(budget.limit_amount).toBe(100.00);

    await db.updateBudgetSpend(budgetId, 25.50);
    const updatedBudget = await db.getBudget('global', null, 'monthly');
    expect(updatedBudget.current_spend).toBe(25.50);
  });

  test('calculates aggregations', async () => {
    await db.logApiCall({
      provider: 'openai',
      endpoint: '/v1/chat/completions',
      cost_usd: 10.00,
      cost_inr: 850.00
    });

    await db.logApiCall({
      provider: 'anthropic',
      endpoint: '/v1/messages',
      cost_usd: 5.00,
      cost_inr: 425.00
    });

    const totalSpend = await db.getTotalSpend('daily');
    expect(totalSpend.total_usd).toBe(15.00);
    expect(totalSpend.total_inr).toBe(1275.00);
    expect(totalSpend.call_count).toBe(2);

    const byProvider = await db.getSpendByProvider();
    expect(byProvider.length).toBe(2);
    expect(byProvider[0].provider).toBe('openai');
    expect(byProvider[0].total_usd).toBe(10.00);
  });
});
