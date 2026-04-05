const { check } = require('../../../src/triggers/types/silent-drain');

describe('Silent Drain Trigger', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      get: jest.fn()
    };
  });

  test('triggers when calls detected without session', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        window_minutes: 10
      })
    };

    mockDb.get.mockResolvedValue({ count: 5 });

    const result = await check(mockDb, trigger, null);

    expect(result.triggered).toBe(true);
    expect(result.details.unsessioned_calls).toBe(5);
  });

  test('does not trigger when no unsessioned calls', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        window_minutes: 10
      })
    };

    mockDb.get.mockResolvedValue({ count: 0 });

    const result = await check(mockDb, trigger, null);

    expect(result.triggered).toBe(false);
  });
});
