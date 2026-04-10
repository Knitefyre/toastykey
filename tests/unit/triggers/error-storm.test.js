const { check } = require('../../../src/triggers/types/error-storm');

describe('Error Storm Trigger', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      db: {
      get: jest.fn(),
        all: jest.fn()
      }
    };
  });

  test('triggers when error rate exceeds threshold', async () => {
    const trigger = {
      scope: 'provider',
      scope_id: 'openai',
      threshold: JSON.stringify({
        threshold_percent: 10,
        window_minutes: 5,
        min_sample_size: 20
      })
    };

    mockDb.db.get.mockResolvedValue({ total: 100, errors: 15 });

    const result = await check(mockDb, trigger, null);

    expect(result.triggered).toBe(true);
    expect(result.metric_value).toBe(15);
    expect(result.details.error_rate).toBe(15);
  });

  test('does not trigger when below threshold', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        threshold_percent: 10,
        window_minutes: 5,
        min_sample_size: 20
      })
    };

    mockDb.db.get.mockResolvedValue({ total: 100, errors: 5 });

    const result = await check(mockDb, trigger, null);

    expect(result.triggered).toBe(false);
  });

  test('returns null when insufficient sample size', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        threshold_percent: 10,
        window_minutes: 5,
        min_sample_size: 50
      })
    };

    mockDb.db.get.mockResolvedValue({ total: 10, errors: 2 });

    const result = await check(mockDb, trigger, null);

    expect(result).toBeNull();
  });
});
