const PricingEngine = require('../src/tracker/pricing');
const path = require('path');

describe('PricingEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new PricingEngine(path.join(__dirname, '..', 'pricing'), 85);
  });

  test('calculates OpenAI GPT-4o cost correctly', () => {
    const cost = engine.calculateCost('openai', 'gpt-4o', 1000, 500);

    expect(cost).toHaveProperty('usd');
    expect(cost).toHaveProperty('inr');
    expect(cost.usd).toBeGreaterThan(0);
    expect(cost.inr).toBeGreaterThan(0);
    expect(cost.inr).toBeCloseTo(cost.usd * 85, 1);
  });

  test('calculates Anthropic Claude Sonnet cost correctly', () => {
    const cost = engine.calculateCost('anthropic', 'claude-sonnet-4-20250514', 1000, 500);

    expect(cost).toHaveProperty('usd');
    expect(cost).toHaveProperty('inr');
    expect(cost.usd).toBeGreaterThan(0);
  });

  test('returns zero for unknown provider', () => {
    const cost = engine.calculateCost('unknown', 'model', 1000, 500);

    expect(cost.usd).toBe(0);
    expect(cost.inr).toBe(0);
  });
});
