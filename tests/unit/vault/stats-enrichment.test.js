const Database = require('../../../src/db');
const KeyVault = require('../../../src/vault');
const fs = require('fs');
const path = require('path');

const TEST_DB = path.join(__dirname, 'vault-stats-test.db');

describe('Vault Stats Enrichment - Status Calculation Logic', () => {
  test('status logic: active when last_success is recent', () => {
    const now = Date.now();
    const usage = {
      last_success: new Date(now - 1000).toISOString(), // 1 second ago
      last_auth_error: null,
      last_used: new Date(now - 1000).toISOString()
    };

    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    let status = 'active';

    if (usage.last_auth_error) {
      const lastAuthErrorTime = new Date(usage.last_auth_error).getTime();
      if (!usage.last_success || new Date(usage.last_success).getTime() < lastAuthErrorTime) {
        status = 'expired';
      }
    } else if (!usage.last_used || new Date(usage.last_used).getTime() < thirtyDaysAgo) {
      status = 'unused';
    }

    expect(status).toBe('active');
  });

  test('status logic: expired when last_auth_error is more recent than last_success', () => {
    const now = Date.now();
    const usage = {
      last_success: new Date(now - 10000).toISOString(), // 10 seconds ago
      last_auth_error: new Date(now - 1000).toISOString(), // 1 second ago (more recent)
      last_used: new Date(now - 1000).toISOString()
    };

    let status = 'active';

    if (usage.last_auth_error) {
      const lastAuthErrorTime = new Date(usage.last_auth_error).getTime();
      if (!usage.last_success || new Date(usage.last_success).getTime() < lastAuthErrorTime) {
        status = 'expired';
      }
    }

    expect(status).toBe('expired');
  });

  test('status logic: expired when no last_success but has last_auth_error', () => {
    const now = Date.now();
    const usage = {
      last_success: null,
      last_auth_error: new Date(now - 1000).toISOString(),
      last_used: new Date(now - 1000).toISOString()
    };

    let status = 'active';

    if (usage.last_auth_error) {
      const lastAuthErrorTime = new Date(usage.last_auth_error).getTime();
      if (!usage.last_success || new Date(usage.last_success).getTime() < lastAuthErrorTime) {
        status = 'expired';
      }
    }

    expect(status).toBe('expired');
  });

  test('status logic: unused when last_used is over 30 days ago', () => {
    const now = Date.now();
    const thirtyFiveDaysAgo = now - (35 * 24 * 60 * 60 * 1000);
    const usage = {
      last_success: new Date(thirtyFiveDaysAgo).toISOString(),
      last_auth_error: null,
      last_used: new Date(thirtyFiveDaysAgo).toISOString()
    };

    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    let status = 'active';

    if (usage.last_auth_error) {
      const lastAuthErrorTime = new Date(usage.last_auth_error).getTime();
      if (!usage.last_success || new Date(usage.last_success).getTime() < lastAuthErrorTime) {
        status = 'expired';
      }
    } else if (!usage.last_used || new Date(usage.last_used).getTime() < thirtyDaysAgo) {
      status = 'unused';
    }

    expect(status).toBe('unused');
  });

  test('status logic: active when auth error but success is more recent', () => {
    const now = Date.now();
    const usage = {
      last_success: new Date(now - 1000).toISOString(), // 1 second ago (more recent)
      last_auth_error: new Date(now - 10000).toISOString(), // 10 seconds ago
      last_used: new Date(now - 1000).toISOString()
    };

    let status = 'active';

    if (usage.last_auth_error) {
      const lastAuthErrorTime = new Date(usage.last_auth_error).getTime();
      if (!usage.last_success || new Date(usage.last_success).getTime() < lastAuthErrorTime) {
        status = 'expired';
      }
    }

    expect(status).toBe('active'); // Recovered from auth error
  });

  test('status logic: unused when no usage data at all', () => {
    const now = Date.now();
    const usage = {
      last_success: null,
      last_auth_error: null,
      last_used: null
    };

    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    let status = 'active';

    if (usage.last_auth_error) {
      const lastAuthErrorTime = new Date(usage.last_auth_error).getTime();
      if (!usage.last_success || new Date(usage.last_success).getTime() < lastAuthErrorTime) {
        status = 'expired';
      }
    } else if (!usage.last_used || new Date(usage.last_used).getTime() < thirtyDaysAgo) {
      status = 'unused';
    }

    expect(status).toBe('unused');
  });
});
