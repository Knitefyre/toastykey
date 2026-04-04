const request = require('supertest');
const ProxyServer = require('../src/proxy');
const Database = require('../src/db');
const KeyVault = require('../src/vault');
const PricingEngine = require('../src/tracker/pricing');
const path = require('path');

describe('ProxyServer', () => {
  let server, app, db;

  beforeAll(async () => {
    db = new Database(':memory:');
    await db.ready;

    const vault = new KeyVault(db, 'test-machine');
    const pricing = new PricingEngine(path.join(__dirname, '..', 'pricing'), 85);

    server = new ProxyServer(db, vault, pricing, 4001);
    app = server.app;
  });

  afterAll(async () => {
    if (db) await db.close();
  });

  test('server responds to health check', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  test('server has CORS enabled', async () => {
    const response = await request(app)
      .options('/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  test('stats endpoint returns spending data', async () => {
    const response = await request(app).get('/stats');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalSpend');
    expect(response.body).toHaveProperty('byProvider');
    expect(response.body).toHaveProperty('byProject');
  });
});
