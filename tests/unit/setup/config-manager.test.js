const ConfigManager = require('../../../src/setup/ConfigManager');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

describe('ConfigManager', () => {
  let configManager;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'toastykey-test-'));
    const configPath = path.join(tempDir, 'config.json');
    configManager = new ConfigManager(configPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('load returns defaults when config file does not exist', async () => {
    const config = await configManager.load();

    expect(config.version).toBe('1.0.0');
    expect(config.first_run_complete).toBe(false);
    expect(config.scan.auto_scan_on_start).toBe(true);
    expect(config.watch.enabled).toBe(false);
    expect(config.preferences.currency).toBe('USD');
    expect(config.preferences.port).toBe(4000);
  });

  test('save writes config to file and load retrieves it', async () => {
    const config = await configManager.load();
    config.first_run_complete = true;
    config.preferences.currency = 'INR';

    await configManager.save(config);

    const loaded = await configManager.load();
    expect(loaded.first_run_complete).toBe(true);
    expect(loaded.preferences.currency).toBe('INR');
    expect(loaded.scan.auto_scan_on_start).toBe(true); // Preserves other defaults
  });

  test('merge respects priority: CLI > env > file > defaults', async () => {
    // Save file config
    const fileConfig = await configManager.load();
    fileConfig.preferences.port = 5000;
    await configManager.save(fileConfig);

    // Simulate env config
    const envConfig = { preferences: { port: 6000 } };

    // Simulate CLI config
    const cliConfig = { preferences: { port: 7000 } };

    const merged = configManager._merge(
      await configManager.load(),
      envConfig,
      cliConfig
    );

    expect(merged.preferences.port).toBe(7000); // CLI wins
  });
});
