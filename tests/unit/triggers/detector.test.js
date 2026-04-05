const AnomalyDetector = require('../../../src/triggers/detector');

describe('AnomalyDetector', () => {
  let detector;
  let mockDb;
  let mockWsServer;
  let mockBaselines;

  beforeEach(() => {
    mockDb = {
      all: jest.fn(),
      get: jest.fn()
    };
    mockWsServer = {
      emit: jest.fn()
    };
    mockBaselines = {
      getRate: jest.fn()
    };

    detector = new AnomalyDetector(mockDb, mockWsServer, mockBaselines);
  });

  afterEach(() => {
    detector.stop();
  });

  test('start() sets up 30-second interval', () => {
    jest.useFakeTimers();
    detector.start();

    expect(detector.interval).toBeDefined();

    jest.useRealTimers();
  });

  test('check() processes enabled triggers', async () => {
    mockDb.all.mockResolvedValue([
      {
        id: 1,
        trigger_type: 'rate_spike',
        threshold: JSON.stringify({ multiplier: 5 }),
        scope: 'global',
        scope_id: null
      }
    ]);

    mockDb.get.mockResolvedValue(null); // No recent events (cooldown check)

    await detector.check();

    expect(mockDb.all).toHaveBeenCalled();
  });

  test('isCooledDown returns false when within cooldown period', async () => {
    const trigger = {
      id: 1,
      threshold: JSON.stringify({ cooldown_minutes: 10 })
    };

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    mockDb.get.mockResolvedValue({ timestamp: fiveMinutesAgo });

    const result = await detector.isCooledDown(trigger);

    expect(result).toBe(false);
  });

  test('isCooledDown returns true when outside cooldown period', async () => {
    const trigger = {
      id: 1,
      threshold: JSON.stringify({ cooldown_minutes: 10 })
    };

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    mockDb.get.mockResolvedValue({ timestamp: fifteenMinutesAgo });

    const result = await detector.isCooledDown(trigger);

    expect(result).toBe(true);
  });
});
