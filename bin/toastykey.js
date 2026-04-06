#!/usr/bin/env node

const path = require('path');
const ConfigManager = require('../src/setup/ConfigManager');

async function main() {
  try {
    const configManager = new ConfigManager();
    const config = await configManager.load();

    // Parse CLI flags
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'config') {
      console.log('Setup wizard not yet implemented');
      process.exit(0);
    }

    if (command === 'reset') {
      await configManager.save({ ...configManager.defaults });
      console.log('✓ Config reset to defaults');
      process.exit(0);
    }

    // Check if first run
    if (!config.first_run_complete) {
      console.log('First run detected - setup wizard will go here');
      console.log('For now, starting server with defaults...');
    }

    // Start server
    const serverMain = require('../src/index.js');
    // Note: src/index.js needs to be modified to accept config and export main function
    console.log('Server start integration pending - Task 1 focuses on ConfigManager');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
