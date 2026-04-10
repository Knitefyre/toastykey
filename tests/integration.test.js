/**
 * Integration tests for full ToastyKey system
 */

const Database = require('../src/db');
const KeyVault = require('../src/vault');
const PricingEngine = require('../src/tracker/pricing');
const ProxyServer = require('../src/proxy');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, 'integration-test.db');

describe('ToastyKey Integration', () => {
  let db, vault, pricing, server;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

    db = new Database(TEST_DB);
    await db.ready;  // CRITICAL: wait for async initialization
    vault = new KeyVault(db, 'test-integration');
    pricing = new PricingEngine(
      path.join(__dirname, '..', 'pricing'),
      85
    );
    server = new ProxyServer(db, vault, pricing, 4002);
  });

  afterAll(async () => {
    await db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  test('system initializes without errors', () => {
    expect(db).toBeDefined();
    expect(vault).toBeDefined();
    expect(pricing).toBeDefined();
    expect(server).toBeDefined();
  });

  test('can store and retrieve API keys', async () => {
    const result = await vault.addKey('openai', 'test', 'sk-test123');
    expect(result.success).toBe(true);

    const retrieved = await vault.getKey('openai', 'test');
    expect(retrieved).toBe('sk-test123');
  });

  test('pricing engine calculates costs correctly', () => {
    const cost = pricing.calculateCost('openai', 'gpt-4o', 1000, 500);

    expect(cost.usd).toBeGreaterThan(0);
    expect(cost.inr).toBeCloseTo(cost.usd * 85, 1);
  });

  test('database stores API calls', async () => {
    const callData = {
      provider: 'openai',
      endpoint: '/v1/chat/completions',
      project: 'test-project',
      model: 'gpt-4o',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.01,
      cost_inr: 0.85,
      status: 200,
      latency_ms: 500
    };

    const result = await db.logApiCall(callData);
    expect(result).toBeGreaterThan(0);

    const calls = await db.getApiCalls({ limit: 1 });
    expect(calls).toHaveLength(1);
    expect(calls[0].provider).toBe('openai');
  });

  test('can set and check budgets', async () => {
    const budget = await db.addBudget({
      scope: 'global',
      scope_id: null,
      period: 'day',
      limit_amount: 500
    });

    expect(budget).toBeGreaterThan(0);

    const retrieved = await db.getBudget('global', null, 'day');
    expect(retrieved.limit_amount).toBe(500);
  });

  test('aggregation queries work', async () => {
    const totalSpend = await db.getTotalSpend('all');
    expect(totalSpend).toBeGreaterThanOrEqual(0);

    const byProvider = await db.getSpendByProvider();
    expect(Array.isArray(byProvider)).toBe(true);
  });

  test('proxy server can start and stop', async () => {
    await server.start();
    // Server should be running
    expect(server.httpServer).toBeDefined();

    await server.stop();
    // Server should be stopped
  });
});

console.log('\n✓ Integration tests completed\n');
