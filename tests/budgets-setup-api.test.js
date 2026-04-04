/**
 * Test budgets and setup API endpoints
 */

const Database = require('../src/db');
const KeyVault = require('../src/vault');
const PricingEngine = require('../src/tracker/pricing');
const ProxyServer = require('../src/proxy');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, 'budgets-setup-test.db');

describe('Budgets and Setup API', () => {
  let db, vault, pricing, server;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

    db = new Database(TEST_DB);
    await db.ready;
    vault = new KeyVault(db, 'test-budgets-setup');
    pricing = new PricingEngine(
      path.join(__dirname, '..', 'pricing'),
      85
    );
    server = new ProxyServer(db, vault, pricing, 4003);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    await db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  describe('Health endpoint', () => {
    test('GET /api/health returns correct response', async () => {
      const response = await fetch('http://localhost:4003/api/health');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.service).toBe('toastykey-api');
      expect(data.version).toBe('0.2.0');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Budgets API', () => {
    test('GET /api/budgets returns empty array initially', async () => {
      const response = await fetch('http://localhost:4003/api/budgets');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgets).toEqual([]);
    });

    test('POST /api/budgets creates a new budget', async () => {
      const response = await fetch('http://localhost:4003/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'global',
          period: 'day',
          limit_amount: 100
        })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('created');
      expect(data.budget_id).toBeGreaterThan(0);
    });

    test('POST /api/budgets updates existing budget', async () => {
      const response = await fetch('http://localhost:4003/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'global',
          period: 'day',
          limit_amount: 200
        })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('updated');
    });

    test('GET /api/budgets returns budgets with status', async () => {
      const response = await fetch('http://localhost:4003/api/budgets');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgets).toHaveLength(1);
      expect(data.budgets[0].scope).toBe('global');
      expect(data.budgets[0].limit_amount).toBe(200);
      expect(data.budgets[0]).toHaveProperty('current_spend');
      expect(data.budgets[0]).toHaveProperty('percentage');
      expect(data.budgets[0]).toHaveProperty('status');
      expect(['ok', 'warning', 'exceeded']).toContain(data.budgets[0].status);
    });

    test('POST /api/budgets validates required fields', async () => {
      const response = await fetch('http://localhost:4003/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'global'
          // Missing period and limit_amount
        })
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
      expect(data.required).toEqual(['scope', 'period', 'limit_amount']);
    });

    test('POST /api/budgets creates project-specific budget', async () => {
      const response = await fetch('http://localhost:4003/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'project',
          period: 'month',
          limit_amount: 500,
          scope_id: 'test-project'
        })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('created');
    });
  });

  describe('Setup API', () => {
    test('GET /api/setup/status checks if setup needed', async () => {
      const response = await fetch('http://localhost:4003/api/setup/status');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('needs_setup');
      expect(typeof data.needs_setup).toBe('boolean');
      if (data.needs_setup) {
        expect(data.reason).toBe('no_keys_and_no_calls');
      } else {
        expect(data.reason).toBeNull();
      }
    });

    test('POST /api/setup/scan validates directories parameter', async () => {
      const response = await fetch('http://localhost:4003/api/setup/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('directories array required');
    });

    test('POST /api/setup/scan handles empty directories', async () => {
      const response = await fetch('http://localhost:4003/api/setup/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directories: []
        })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.found_files).toEqual([]);
    });

    test('POST /api/setup/scan handles non-existent directories', async () => {
      const response = await fetch('http://localhost:4003/api/setup/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directories: ['/nonexistent/path']
        })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.found_files).toEqual([]);
    });

    test('GET /api/setup/status shows needs_setup false after adding key', async () => {
      // Add a test key
      await vault.addKey('openai', 'test-key', 'sk-testkey123');

      const response = await fetch('http://localhost:4003/api/setup/status');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.needs_setup).toBe(false);
      expect(data.reason).toBeNull();
    });
  });
});

console.log('\n✓ Budgets and Setup API tests completed\n');
