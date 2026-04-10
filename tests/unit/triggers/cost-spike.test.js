const { check } = require('../../../src/triggers/types/cost-spike');

describe('Cost Spike Trigger', () => {
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
      getCost: jest.fn()
    };
  });

  test('triggers when cost exceeds baseline × multiplier', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        multiplier: 3,
        window_minutes: 60,
        min_sample_size: 10
      })
    };

    mockDb.db.get.mockResolvedValue({ cost: 15 });
    mockBaselines.getCost.mockResolvedValue({ value: 4, sample_size: 100 });

    const result = await check(mockDb, trigger, mockBaselines);

    expect(result.triggered).toBe(true);
    expect(result.metric_value).toBe(15);
    expect(result.baseline_value).toBe(4);
    expect(result.details.multiplier_exceeded).toBeCloseTo(3.75);
  });

  test('does not trigger when below threshold', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        multiplier: 3,
        window_minutes: 60,
        min_sample_size: 10
      })
    };

    mockDb.db.get.mockResolvedValue({ cost: 10 });
    mockBaselines.getCost.mockResolvedValue({ value: 4, sample_size: 100 });

    const result = await check(mockDb, trigger, mockBaselines);

    expect(result.triggered).toBe(false);
  });
});
