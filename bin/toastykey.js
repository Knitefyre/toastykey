#!/usr/bin/env node

const path = require('path');
const ConfigManager = require('../src/setup/ConfigManager');
const KeyScanner = require('../src/setup/KeyScanner');
const SetupManager = require('../src/setup/SetupManager');

async function main() {
  try {
    const configManager = new ConfigManager();
    const config = await configManager.load();

    // Parse CLI flags
    const args = process.argv.slice(2);
    const command = args[0];

    // Handle subcommands
    if (command === 'config') {
      const keyScanner = new KeyScanner(configManager);
      const setupManager = new SetupManager(configManager, keyScanner);
      await setupManager.runWizard();
      process.exit(0);
    }

    if (command === 'reset') {
      await configManager.save({ ...configManager.defaults });
      console.log('✓ Config reset to defaults');
      process.exit(0);
    }

    // Check if first run
    if (!config.first_run_complete) {
      const keyScanner = new KeyScanner(configManager);
      const setupManager = new SetupManager(configManager, keyScanner);
      const newConfig = await setupManager.runWizard();

      // Import keys if any were found
      if (newConfig.scan && newConfig.scan.paths.length > 0) {
        // Keys will be imported by importKeysToVault function
      }

      // Start server with new config
      const { main: serverMain } = require('../src/index.js');
      await serverMain({
        ...newConfig,
        skipBanner: false
      });

      // Open dashboard
      await setupManager.openDashboard(newConfig.preferences.port === 4000 ? 3000 : newConfig.preferences.port - 1000);

    } else {
      // Subsequent run - quick check
      console.log('\n🔥 ToastyKey\n');

      // TODO: Quick check for new .env files

      // Start server
      const { main: serverMain } = require('../src/index.js');
      await serverMain({
        ...config,
        skipBanner: true
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
