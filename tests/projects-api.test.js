const request = require('supertest');
const ProxyServer = require('../src/proxy');
const Database = require('../src/db');
const KeyVault = require('../src/vault');
const PricingEngine = require('../src/tracker/pricing');
const path = require('path');

describe('Projects API', () => {
  let server, app, db;

  beforeAll(async () => {
    db = new Database(':memory:');
    await db.ready;

    const vault = new KeyVault(db, 'test-machine');
    const pricing = new PricingEngine(path.join(__dirname, '..', 'pricing'), 85);

    server = new ProxyServer(db, vault, pricing, 4001);
    app = server.app;

    // Add test data
    const projectId = await db.addProject('test-project', '/test/path');

    await db.logApiCall({
      provider: 'openai',
      endpoint: '/v1/chat/completions',
      project: 'test-project',
      model: 'gpt-4',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.01,
      cost_inr: 0.85,
      status: 200,
      latency_ms: 1000
    });
  });

  afterAll(async () => {
    if (db) await db.close();
  });

  test('GET /api/projects returns all projects', async () => {
    const response = await request(app).get('/api/projects');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('projects');
    expect(Array.isArray(response.body.projects)).toBe(true);

    if (response.body.projects.length > 0) {
      const project = response.body.projects[0];
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('total_cost_inr');
      expect(project).toHaveProperty('call_count');
    }
  });

  test('GET /api/projects/:id returns project detail', async () => {
    // First get all projects to get a valid ID
    const projectsResponse = await request(app).get('/api/projects');

    if (projectsResponse.body.projects.length > 0) {
      const projectId = projectsResponse.body.projects[0].id;
      const response = await request(app).get(`/api/projects/${projectId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('project');
      expect(response.body).toHaveProperty('cost_by_provider');
      expect(response.body).toHaveProperty('cost_over_time');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('recent_calls');

      expect(Array.isArray(response.body.cost_by_provider)).toBe(true);
      expect(Array.isArray(response.body.cost_over_time)).toBe(true);
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(Array.isArray(response.body.recent_calls)).toBe(true);
    }
  });

  test('GET /api/projects/:id returns 404 for non-existent project', async () => {
    const response = await request(app).get('/api/projects/99999');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
});
