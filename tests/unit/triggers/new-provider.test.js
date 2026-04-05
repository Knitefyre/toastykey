const { check } = require('../../../src/triggers/types/new-provider');

describe('New Provider Trigger', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      all: jest.fn()
    };
  });

  test('triggers when new provider detected', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        window_minutes: 1
      })
    };

    // First call returns historical providers
    mockDb.all.mockResolvedValueOnce([
      { provider: 'openai' },
      { provider: 'anthropic' }
    ]);

    // Second call returns recent providers (including new one)
    mockDb.all.mockResolvedValueOnce([
      { provider: 'openai' },
      { provider: 'anthropic' },
      { provider: 'elevenlabs' }
    ]);

    const result = await check(mockDb, trigger, null);

    expect(result.triggered).toBe(true);
    expect(result.details.new_provider).toBe('elevenlabs');
  });

  test('does not trigger when no new providers', async () => {
    const trigger = {
      scope: 'global',
      scope_id: null,
      threshold: JSON.stringify({
        window_minutes: 1
      })
    };

    mockDb.all.mockResolvedValueOnce([
      { provider: 'openai' },
      { provider: 'anthropic' }
    ]);

    mockDb.all.mockResolvedValueOnce([
      { provider: 'openai' }
    ]);

    const result = await check(mockDb, trigger, null);

    expect(result.triggered).toBe(false);
  });
});
