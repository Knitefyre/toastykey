const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('First Run Integration', () => {
  let tempDir;
  let configPath;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'toastykey-integration-'));
    configPath = path.join(tempDir, 'config.json');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('first run creates config file', async () => {
    // This test verifies the config manager works
    const ConfigManager = require('../../src/setup/ConfigManager');
    const configManager = new ConfigManager(configPath);

    const config = await configManager.load();
    expect(config.first_run_complete).toBe(false);

    config.first_run_complete = true;
    await configManager.save(config);

    const exists = await fs.access(configPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  }, 10000);
});
