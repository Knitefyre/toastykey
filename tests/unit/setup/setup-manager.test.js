const ConfigManager = require('../../../src/setup/ConfigManager');
const KeyScanner = require('../../../src/setup/KeyScanner');

// Mock all external dependencies before requiring SetupManager
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

jest.mock('chalk', () => ({
  bold: jest.fn(str => str),
  gray: jest.fn(str => str),
  cyan: jest.fn(str => str),
  green: jest.fn(str => str),
  yellow: jest.fn(str => str)
}));

jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis()
  }));
});

jest.mock('open', () => jest.fn());

const inquirer = require('inquirer');
const SetupManager = require('../../../src/setup/SetupManager');

describe('SetupManager', () => {
  let setupManager;
  let configManager;
  let keyScanner;

  beforeEach(() => {
    configManager = new ConfigManager(':memory:');
    keyScanner = new KeyScanner(configManager);
    setupManager = new SetupManager(configManager, keyScanner);
  });

  describe('runWizard', () => {
    test('completes 4-step wizard flow', async () => {
      // Mock inquirer prompts
      inquirer.prompt = jest.fn()
        .mockResolvedValueOnce({ scanChoice: 'no' }) // Step 1: No additional scan
        .mockResolvedValueOnce({ budgetChoice: 'skip' }) // Step 2: Skip budget
        .mockResolvedValueOnce({ watchChoice: [] }); // Step 3: No watch dirs

      const config = await setupManager.runWizard();

      expect(config.first_run_complete).toBe(true);
      expect(inquirer.prompt).toHaveBeenCalledTimes(3);
    });
  });
});
