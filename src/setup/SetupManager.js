const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const open = require('open');
const path = require('path');

class SetupManager {
  constructor(configManager, keyScanner) {
    this.configManager = configManager;
    this.keyScanner = keyScanner;
  }

  async runWizard() {
    console.log(chalk.bold('\n🔥 ToastyKey Setup'));
    console.log(chalk.gray('Track. Control. Understand.\n'));

    const config = await this.configManager.load();
    const results = {};

    // Step 1: Scan for API keys
    results.keys = await this._step1ScanKeys();

    // Step 2: Set budget (optional)
    results.budget = await this._step2SetBudget();

    // Step 3: Auto-discover projects (optional)
    results.watch = await this._step3AutoDiscover();

    // Step 4: Launch
    await this._step4Launch();

    // Update config
    config.first_run_complete = true;
    config.first_run_timestamp = new Date().toISOString();
    config.scan.paths = results.keys.scanPaths || [];
    config.scan.last_scan_timestamp = new Date().toISOString();
    config.watch.enabled = results.watch.enabled || false;
    config.watch.directories = results.watch.directories || [];

    if (results.budget) {
      config.preferences.currency = results.budget.currency;
    }

    await this.configManager.save(config);

    return config;
  }

  async _step1ScanKeys() {
    console.log(chalk.bold('\nStep 1/4: Scan for API Keys'));
    console.log(chalk.gray('━'.repeat(40)));

    const spinner = ora('Scanning current directory...').start();

    const currentDirKeys = await this.keyScanner.scanPaths([process.cwd()]);

    spinner.succeed(`Found ${currentDirKeys.length} API key${currentDirKeys.length === 1 ? '' : 's'} in current directory`);

    // Display found keys
    for (const key of currentDirKeys) {
      console.log(chalk.gray('  • ') + chalk.cyan(key.provider) +
                  chalk.gray(` (${this.keyScanner.redactKey(key.key)})`));
    }

    // Prompt for additional scanning
    const { scanChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'scanChoice',
        message: 'Scan additional locations?',
        choices: [
          { name: 'Yes, scan ~/.config and environment variables', value: 'extended' },
          { name: 'No, use only these keys', value: 'no' },
          { name: 'Let me choose specific directories', value: 'custom' }
        ],
        default: 'no'
      }
    ]);

    let allKeys = [...currentDirKeys];
    const scanPaths = [process.cwd()];

    if (scanChoice === 'extended') {
      const spinner2 = ora('Scanning ~/.config and environment...').start();

      const configKeys = await this.keyScanner.scanPaths([
        path.join(require('os').homedir(), '.config')
      ]);
      const envKeys = this.keyScanner.scanEnvironment();

      allKeys = [...allKeys, ...configKeys, ...envKeys];
      allKeys = this.keyScanner._deduplicateKeys(allKeys);

      spinner2.succeed(`Found ${allKeys.length} total API keys`);
      scanPaths.push(path.join(require('os').homedir(), '.config'));
    }

    if (allKeys.length > 0) {
      const { importKeys } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'importKeys',
          message: `Import ${allKeys.length === 1 ? 'this key' : 'all keys'}?`,
          default: true
        }
      ]);

      if (importKeys) {
        // Keys will be imported by server on startup
        console.log(chalk.green('✓ Keys will be imported on server start'));
      }
    }

    return { keys: allKeys, scanPaths };
  }

  async _step2SetBudget() {
    console.log(chalk.bold('\nStep 2/4: Set Global Budget (Optional)'));
    console.log(chalk.gray('━'.repeat(40)));

    const { budgetChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'budgetChoice',
        message: 'Set a spending limit? (Press Enter to skip)',
        choices: [
          { name: 'Yes, set daily budget', value: 'daily' },
          { name: 'Yes, set monthly budget', value: 'monthly' },
          { name: 'Skip for now', value: 'skip' }
        ],
        default: 'skip'
      }
    ]);

    if (budgetChoice === 'skip') {
      return null;
    }

    const { limit, currency } = await inquirer.prompt([
      {
        type: 'number',
        name: 'limit',
        message: `${budgetChoice === 'daily' ? 'Daily' : 'Monthly'} budget limit:`,
        default: 500
      },
      {
        type: 'list',
        name: 'currency',
        message: 'Currency:',
        choices: ['INR (₹)', 'USD ($)'],
        default: 'USD ($)'
      }
    ]);

    const currencyCode = currency.startsWith('INR') ? 'INR' : 'USD';

    console.log(chalk.green(`✓ ${budgetChoice === 'daily' ? 'Daily' : 'Monthly'} budget set: ${currencyCode === 'INR' ? '₹' : '$'}${limit}`));

    return { period: budgetChoice, limit, currency: currencyCode };
  }

  async _step3AutoDiscover() {
    console.log(chalk.bold('\nStep 3/4: Auto-Discover Projects (Optional)'));
    console.log(chalk.gray('━'.repeat(40)));

    const homeDir = require('os').homedir();
    const commonDirs = [
      path.join(homeDir, 'Projects'),
      path.join(homeDir, 'Documents'),
      path.join(homeDir, 'code')
    ];

    const { watchChoice } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'watchChoice',
        message: 'Watch directories for new projects? (Press Enter to skip)',
        choices: commonDirs.map(dir => ({ name: dir, value: dir, checked: false }))
      }
    ]);

    if (watchChoice.length > 0) {
      console.log(chalk.green(`✓ Watching ${watchChoice.length} director${watchChoice.length === 1 ? 'y' : 'ies'} for new projects`));
      return { enabled: true, directories: watchChoice };
    }

    return { enabled: false, directories: [] };
  }

  async _step4Launch() {
    console.log(chalk.bold('\nStep 4/4: Launch'));
    console.log(chalk.gray('━'.repeat(40)));
    console.log(chalk.green('✓ Setup complete!\n'));
  }

  async openDashboard(port = 3000) {
    try {
      await open(`http://localhost:${port}`);
      console.log(chalk.green('🎉 Opening dashboard...'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Couldn\'t open browser automatically'));
      console.log(chalk.gray(`   Dashboard available at http://localhost:${port}`));
    }
  }
}

module.exports = SetupManager;
