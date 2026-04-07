#!/usr/bin/env node

const path = require('path');
const chalk = require('chalk');
const ConfigManager = require('../src/setup/ConfigManager');
const KeyScanner = require('../src/setup/KeyScanner');
const SetupManager = require('../src/setup/SetupManager');
const { importKeysToVault, quickScanForNewKeys } = require('../src/setup/utils');

async function main() {
  try {
    const configManager = new ConfigManager();
    const config = await configManager.load();

    // Parse CLI flags
    const args = process.argv.slice(2);
    const command = args[0];

    // Handle 'scan' subcommand
    if (command === 'scan') {
      const keyScanner = new KeyScanner(configManager);

      console.log('Scanning for new API keys...\n');
      const newKeys = await quickScanForNewKeys(keyScanner, configManager);

      if (newKeys.length === 0) {
        console.log(chalk.green('✓ No new keys found'));
      } else {
        console.log(chalk.cyan(`Found ${newKeys.length} new key${newKeys.length === 1 ? '' : 's'}:\n`));

        for (const key of newKeys) {
          console.log(`  ${chalk.cyan(key.provider)} - ${chalk.gray(keyScanner.redactKey(key.key))}`);
          console.log(chalk.gray(`    Source: ${key.source}`));
        }
      }

      process.exit(0);
    }

    // Handle 'watch' subcommand
    if (command === 'watch') {
      const subcommand = args[1];

      if (subcommand === 'list') {
        console.log(chalk.bold('Watched directories:\n'));

        if (config.watch?.directories?.length > 0) {
          for (const dir of config.watch.directories) {
            console.log(`  ${chalk.cyan('•')} ${dir}`);
          }
        } else {
          console.log(chalk.gray('  (none)'));
        }

        process.exit(0);
      }

      if (subcommand === 'add') {
        const dir = args[2];
        if (!dir) {
          console.error(chalk.red('Error: Directory path required'));
          console.log('Usage: toastykey watch add <directory>');
          process.exit(1);
        }

        config.watch = config.watch || { enabled: false, directories: [] };
        config.watch.directories.push(dir);
        config.watch.enabled = true;

        await configManager.save(config);
        console.log(chalk.green(`✓ Added ${dir} to watched directories`));

        process.exit(0);
      }

      if (subcommand === 'remove') {
        const dir = args[2];
        if (!dir) {
          console.error(chalk.red('Error: Directory path required'));
          console.log('Usage: toastykey watch remove <directory>');
          process.exit(1);
        }

        config.watch.directories = config.watch.directories.filter(d => d !== dir);
        if (config.watch.directories.length === 0) {
          config.watch.enabled = false;
        }

        await configManager.save(config);
        console.log(chalk.green(`✓ Removed ${dir} from watched directories`));

        process.exit(0);
      }

      console.log(chalk.bold('Usage:'));
      console.log('  toastykey watch list              - Show watched directories');
      console.log('  toastykey watch add <directory>   - Add directory to watch');
      console.log('  toastykey watch remove <directory> - Remove directory');
      process.exit(0);
    }

    // Handle 'config' subcommand
    if (command === 'config') {
      const keyScanner = new KeyScanner(configManager);
      const setupManager = new SetupManager(configManager, keyScanner);
      await setupManager.runWizard();
      process.exit(0);
    }

    // Handle 'reset' subcommand
    if (command === 'reset') {
      await configManager.save({ ...configManager.defaults });
      console.log(chalk.green('✓ Config reset to defaults'));
      process.exit(0);
    }

    // Check if first run
    if (!config.first_run_complete) {
      const keyScanner = new KeyScanner(configManager);
      const setupManager = new SetupManager(configManager, keyScanner);
      const newConfig = await setupManager.runWizard();

      // Import keys if any were found
      if (newConfig.scan && newConfig.scan.paths.length > 0) {
        // Keys will be imported by importKeysToVault function (requires DB/vault setup)
        // This is a placeholder for future implementation
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

      if (config.scan?.auto_scan_on_start && !args.includes('--no-scan')) {
        const ora = require('ora');
        const spinner = ora('Quick check...').start();

        const keyScanner = new KeyScanner(configManager);
        const newKeys = await quickScanForNewKeys(keyScanner, configManager);

        spinner.stop();

        if (newKeys.length > 0) {
          console.log(chalk.cyan(`• Found ${newKeys.length} new .env file${newKeys.length === 1 ? '' : 's'} since last run`));

          for (const key of newKeys) {
            console.log(chalk.gray(`  ${key.source} (${key.provider})`));
          }

          const inquirer = require('inquirer');
          const { importNew } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'importNew',
              message: 'Import these keys?',
              default: true
            }
          ]);

          if (importNew) {
            const Database = require('../src/db');
            const KeyVault = require('../src/vault');

            const db = new Database('./toastykey.db');
            await db.ready;

            const vault = new KeyVault(db, 'default');

            const { imported } = await importKeysToVault(vault, newKeys);
            console.log(chalk.green(`✓ Imported ${imported.length} keys\n`));

            // Update last scan timestamp
            config.scan.last_scan_timestamp = new Date().toISOString();
            await configManager.save(config);
          }
        }
      }

      console.log('Starting ToastyKey...');

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
