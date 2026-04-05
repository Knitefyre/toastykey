const BaselineStorage = require('../../../src/baselines/storage');

describe('BaselineStorage', () => {
  let storage;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      createBaseline: jest.fn(),
      getBaseline: jest.fn(),
      getBaselines: jest.fn()
    };
    storage = new BaselineStorage(mockDb);
  });

  test('getRate returns stored baseline value', async () => {
    mockDb.getBaseline.mockResolvedValue({
      value: 10.5,
      sample_size: 100
    });

    const result = await storage.getRate('global', null, 2);

    expect(result.value).toBe(10.5);
    expect(result.sample_size).toBe(100);
    expect(mockDb.getBaseline).toHaveBeenCalledWith('global', null, 'call_rate', 7);
  });

  test('getRate returns null when no baseline exists', async () => {
    mockDb.getBaseline.mockResolvedValue(undefined);

    const result = await storage.getRate('provider', 'openai', 5);

    expect(result).toBeNull();
  });

  test('storeRate saves baseline to database', async () => {
    mockDb.createBaseline.mockResolvedValue(1);

    const today = new Date().toISOString().split('T')[0];
    await storage.storeRate('global', null, 15.2, 200);

    expect(mockDb.createBaseline).toHaveBeenCalledWith(
      today,
      'global',
      null,
      'call_rate',
      15.2,
      200
    );
  });
});
