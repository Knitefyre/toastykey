const { check } = require('../../../src/triggers/types/token-explosion');

describe('Token Explosion Trigger', () => {
  let mockDb;
  let mockBaselines;

  beforeEach(() => {
    mockDb = {
      get: jest.fn()
    };
    mockBaselines = {
      getTokenAverage: jest.fn()
    };
  });

  test('triggers when single call tokens exceed baseline × multiplier', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        multiplier: 10,
        min_sample_size: 50
      })
    };

    mockDb.get.mockResolvedValue({
      id: 123,
      total_tokens: 50000,
      model: 'gpt-4'
    });

    mockBaselines.getTokenAverage.mockResolvedValue({
      value: 2000,
      sample_size: 100
    });

    const result = await check(mockDb, trigger, mockBaselines);

    expect(result.triggered).toBe(true);
    expect(result.metric_value).toBe(50000);
    expect(result.baseline_value).toBe(2000);
    expect(result.details.multiplier_exceeded).toBe(25);
  });

  test('does not trigger when no calls exceed threshold', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        multiplier: 10,
        min_sample_size: 50
      })
    };

    mockDb.get.mockResolvedValue(undefined);
    mockBaselines.getTokenAverage.mockResolvedValue({
      value: 2000,
      sample_size: 100
    });

    const result = await check(mockDb, trigger, mockBaselines);

    expect(result.triggered).toBe(false);
  });
});
