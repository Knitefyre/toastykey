const { executeAction } = require('../../../src/triggers/actions');
const axios = require('axios');

jest.mock('axios');

describe('Action Executor', () => {
  let mockDb;
  let mockWsServer;

  beforeEach(() => {
    mockDb = {
      run: jest.fn().mockResolvedValue({ lastID: 1 })
    };
    mockWsServer = {
      emit: jest.fn()
    };
  });

  test('log_only action creates event record', async () => {
    const trigger = {
      id: 1,
      action: 'log_only'
    };

    const event = {
      entity_type: 'provider',
      entity_id: 'openai',
      metric_value: 100,
      baseline_value: 10,
      details: { test: 'data' }
    };

    await executeAction(mockDb, mockWsServer, trigger, event);

    expect(mockDb.run).toHaveBeenCalled();
  });

  test('dashboard_notify emits WebSocket event', async () => {
    const trigger = {
      id: 1,
      trigger_type: 'rate_spike',
      action: 'dashboard_notify'
    };

    const event = {
      entity_type: 'provider',
      entity_id: 'openai',
      metric_value: 100,
      baseline_value: 10,
      details: { test: 'data' }
    };

    await executeAction(mockDb, mockWsServer, trigger, event);

    expect(mockWsServer.emit).toHaveBeenCalledWith('anomaly_detected', expect.objectContaining({
      trigger_id: 1,
      type: 'rate_spike'
    }));
  });

  test('auto_pause creates pause_state record', async () => {
    const trigger = {
      id: 1,
      action: 'auto_pause'
    };

    const event = {
      entity_type: 'provider',
      entity_id: 'openai',
      metric_value: 100,
      baseline_value: 10,
      details: {}
    };

    await executeAction(mockDb, mockWsServer, trigger, event);

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO pause_states'),
      expect.arrayContaining(['provider', 'openai'])
    );
  });

  test('webhook action posts to URL', async () => {
    const trigger = {
      id: 1,
      action: 'webhook',
      webhook_url: 'https://example.com/webhook'
    };

    const event = {
      entity_type: 'provider',
      entity_id: 'openai',
      metric_value: 100,
      baseline_value: 10,
      details: {}
    };

    axios.post.mockResolvedValue({ status: 200 });

    await executeAction(mockDb, mockWsServer, trigger, event);

    expect(axios.post).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        trigger_id: 1,
        entity_type: 'provider'
      }),
      { timeout: 5000 }
    );
  });
});
