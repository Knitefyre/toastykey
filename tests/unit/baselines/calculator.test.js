const BaselineCalculator = require('../../../src/baselines/calculator');

describe('BaselineCalculator', () => {
  let calculator;
  let mockDb;

  beforeEach(() => {
    // Mock database with required methods
    mockDb = {
      db: {
        get: jest.fn(),
        all: jest.fn()
      },
      createBaseline: jest.fn()
    };
    calculator = new BaselineCalculator(mockDb);
  });

  afterEach(() => {
    if (calculator.intervalId) {
      calculator.stop();
    }
    jest.clearAllTimers();
  });

  describe('calculateMetric', () => {
    it('should compute call_rate correctly (1000 calls / 168 hours = 5.95)', async () => {
      // Mock query to return 1000 calls over 7 days
      mockDb.db.get.mockResolvedValue({ count: 1000 });

      const result = await calculator.calculateMetric('global', null, 'call_rate');

      // 1000 calls / 168 hours = 5.952380952... ≈ 5.95
      expect(result).toBeCloseTo(5.95, 2);
      expect(mockDb.db.get).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        expect.any(Array)
      );
    });

    it('should compute cost_rate correctly (84 / 168 = 0.5)', async () => {
      // Mock query to return total cost of 84 over 7 days
      mockDb.db.get.mockResolvedValue({ total: 84 });

      const result = await calculator.calculateMetric('global', null, 'cost_rate');

      // 84 / 168 hours = 0.5
      expect(result).toBe(0.5);
      expect(mockDb.db.get).toHaveBeenCalledWith(
        expect.stringContaining('SUM(cost_usd)'),
        expect.any(Array)
      );
    });

    it('should compute error_rate correctly ((50/1000)*100 = 5%)', async () => {
      // Mock query to return 50 errors out of 1000 total calls
      mockDb.db.get.mockResolvedValue({ errors: 50, total: 1000 });

      const result = await calculator.calculateMetric('global', null, 'error_rate');

      // (50 / 1000) * 100 = 5%
      expect(result).toBe(5);
      expect(mockDb.db.get).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        expect.any(Array)
      );
    });

    it('should return null for insufficient data (total < 10)', async () => {
      // Mock query to return only 5 calls
      mockDb.db.get.mockResolvedValue({ count: 5 });

      const result = await calculator.calculateMetric('global', null, 'token_avg');

      expect(result).toBeNull();
    });

    it('should compute token_avg correctly when sample size > 10', async () => {
      // Mock sample size check
      mockDb.db.get
        .mockResolvedValueOnce({ count: 100 }) // getSampleSize
        .mockResolvedValueOnce({ avg_tokens: 1500 }); // calculateMetric query

      const result = await calculator.calculateMetric('global', null, 'token_avg');

      expect(result).toBe(1500);
    });
  });

  describe('start', () => {
    it('should set up hourly interval', async () => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setInterval');
      jest.spyOn(calculator, 'updateAll').mockResolvedValue();

      await calculator.start();

      // Should set up an interval with 3600000ms (1 hour)
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        3600000
      );

      jest.useRealTimers();
    });

    it('should run updateAll immediately on start', async () => {
      jest.useFakeTimers();
      jest.spyOn(calculator, 'updateAll').mockResolvedValue();

      await calculator.start();

      expect(calculator.updateAll).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('getSampleSize', () => {
    it('should return sample size for global scope', async () => {
      mockDb.db.get.mockResolvedValue({ count: 1000 });

      const result = await calculator.getSampleSize('global', null);

      expect(result).toBe(1000);
      expect(mockDb.db.get).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        expect.arrayContaining([expect.any(String)])
      );
    });

    it('should return sample size for provider scope', async () => {
      mockDb.db.get.mockResolvedValue({ count: 500 });

      const result = await calculator.getSampleSize('provider', 'openai');

      expect(result).toBe(500);
      expect(mockDb.db.get).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        expect.arrayContaining([expect.any(String), 'openai'])
      );
    });

    it('should return sample size for project scope', async () => {
      mockDb.db.get.mockResolvedValue({ count: 250 });

      const result = await calculator.getSampleSize('project', 'my-project');

      expect(result).toBe(250);
      expect(mockDb.db.get).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        expect.arrayContaining([expect.any(String), 'my-project'])
      );
    });
  });

  describe('storeBaseline', () => {
    it('should store baseline using db.createBaseline', async () => {
      mockDb.createBaseline.mockResolvedValue(1);

      await calculator.storeBaseline('global', null, 'call_rate', 5.95, 1000);

      expect(mockDb.createBaseline).toHaveBeenCalledWith({
        date: expect.any(String),
        scope: 'global',
        scope_id: null,
        metric: 'call_rate',
        value: 5.95,
        sample_size: 1000
      });
    });
  });

  describe('stop', () => {
    it('should clear the interval', async () => {
      jest.useFakeTimers();
      jest.spyOn(calculator, 'updateAll').mockResolvedValue();

      await calculator.start();
      const intervalId = calculator.intervalId;
      calculator.stop();

      expect(calculator.intervalId).toBeNull();
      expect(intervalId).not.toBeNull();

      jest.useRealTimers();
    });
  });
});
