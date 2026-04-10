const Database = require('../../../src/db');
const KeyVault = require('../../../src/vault');
const { generateDemoData } = require('../../../src/demo/generator');
const fs = require('fs');
const path = require('path');

const TEST_DB = path.join(__dirname, 'demo-test.db');

describe('Demo Data Generator', () => {
  let db, vault;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    db = new Database(TEST_DB);
    await db.ready;
    vault = new KeyVault(db, 'test-machine-id');
  });

  afterAll(async () => {
    await db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  test('generates correct number of API keys', async () => {
    await generateDemoData(db, vault);

    const keys = await db.db.all('SELECT * FROM api_keys');
    expect(keys.length).toBe(4); // openai, anthropic, elevenlabs, stability
  });

  test('generates correct number of projects', async () => {
    const projects = await db.db.all('SELECT * FROM projects');
    expect(projects.length).toBe(5);

    const projectNames = projects.map(p => p.name);
    expect(projectNames).toContain('my-saas-app');
    expect(projectNames).toContain('spazi-website');
    expect(projectNames).toContain('toastykey-dev');
  });

  test('generates 500 API calls', async () => {
    const calls = await db.db.all('SELECT * FROM api_calls');
    expect(calls.length).toBe(500);
  });

  test('API calls have realistic cost distribution', async () => {
    const calls = await db.db.all('SELECT * FROM api_calls WHERE cost_inr > 0');
    expect(calls.length).toBeGreaterThan(0);

    // Check cost ranges
    const openaiCalls = calls.filter(c => c.provider === 'openai');
    const anthropicCalls = calls.filter(c => c.provider === 'anthropic');

    expect(openaiCalls.length).toBeGreaterThan(0);
    expect(anthropicCalls.length).toBeGreaterThan(0);

    // OpenAI should have ~60% of calls
    expect(openaiCalls.length / calls.length).toBeGreaterThan(0.5);
    expect(openaiCalls.length / calls.length).toBeLessThan(0.7);
  });

  test('generates budgets', async () => {
    const budgets = await db.db.all('SELECT * FROM budgets');
    expect(budgets.length).toBeGreaterThanOrEqual(2);

    const globalBudget = budgets.find(b => b.scope === 'global');
    expect(globalBudget).toBeDefined();
    expect(globalBudget.limit_amount).toBe(500);
  });

  test('generates triggers', async () => {
    const triggers = await db.db.all('SELECT * FROM triggers');
    expect(triggers.length).toBeGreaterThanOrEqual(3);

    const triggerTypes = triggers.map(t => t.trigger_type);
    expect(triggerTypes).toContain('rate_spike');
    expect(triggerTypes).toContain('cost_spike');
    expect(triggerTypes).toContain('error_storm');
  });

  test('generates trigger events', async () => {
    const events = await db.db.all('SELECT * FROM trigger_events');
    expect(events.length).toBe(5);
  });

  test('generates reports', async () => {
    const reports = await db.db.all('SELECT * FROM reports');
    expect(reports.length).toBeGreaterThanOrEqual(2);

    const reportPeriods = reports.map(r => r.period);
    expect(reportPeriods).toContain('weekly');
    expect(reportPeriods).toContain('monthly');
  });
});
