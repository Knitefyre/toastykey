const { check } = require('../../../src/triggers/types/rate-spike');

describe('Rate Spike Trigger', () => {
  let mockDb;
  let mockBaselines;

  beforeEach(() => {
    mockDb = {
      db: {
      get: jest.fn(),
        all: jest.fn()
      }
    };
    mockBaselines = {
      getRate: jest.fn()
    };
  });

  test('triggers when rate exceeds baseline × multiplier', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        multiplier: 5,
        window_minutes: 2,
        min_sample_size: 10
      })
    };

    mockDb.db.get.mockResolvedValue({ calls: 100 });
    mockBaselines.getRate.mockResolvedValue({ value: 8, sample_size: 100 });

    const result = await check(mockDb, trigger, mockBaselines);

    expect(result.triggered).toBe(true);
    expect(result.metric_value).toBe(50);
    expect(result.baseline_value).toBe(8);
    expect(result.details.multiplier_exceeded).toBeCloseTo(6.25);
  });

  test('does not trigger when below threshold', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        multiplier: 5,
        window_minutes: 2,
        min_sample_size: 10
      })
    };

    mockDb.db.get.mockResolvedValue({ calls: 30 });
    mockBaselines.getRate.mockResolvedValue({ value: 8, sample_size: 100 });

    const result = await check(mockDb, trigger, mockBaselines);

    expect(result.triggered).toBe(false);
  });

  test('returns null when insufficient baseline data', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        multiplier: 5,
        window_minutes: 2,
        min_sample_size: 50
      })
    };

    mockDb.db.get.mockResolvedValue({ calls: 100 });
    mockBaselines.getRate.mockResolvedValue({ value: 8, sample_size: 10 });

    const result = await check(mockDb, trigger, mockBaselines);

    expect(result).toBeNull();
  });

  test('applies provider scope filter', async () => {
    const trigger = {
      scope: 'provider',
      scope_id: 'openai',
      threshold: JSON.stringify({
        multiplier: 5,
        window_minutes: 2,
        min_sample_size: 10
      })
    };

    mockDb.db.get.mockResolvedValue({ calls: 100 });
    mockBaselines.getRate.mockResolvedValue({ value: 8, sample_size: 100 });

    await check(mockDb, trigger, mockBaselines);

    const dbCall = mockDb.db.get.mock.calls[0][0];
    expect(dbCall).toContain("AND provider = 'openai'");
  });
});
