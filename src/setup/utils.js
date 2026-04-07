const chalk = require('chalk');

async function importKeysToVault(vault, keys) {
  if (!keys || keys.length === 0) {
    return { imported: [], failed: [] };
  }

  const imported = [];
  const failed = [];

  for (const key of keys) {
    try {
      await vault.addKey(key.provider, key.label || key.source, key.key);
      imported.push(key);
    } catch (error) {
      console.warn(chalk.yellow(`  ⚠️  Couldn't import ${key.provider} key: ${error.message}`));
      failed.push({ key, error: error.message });
    }
  }

  return { imported, failed };
}

async function quickScanForNewKeys(keyScanner, configManager) {
  const config = await configManager.load();

  if (!config.scan || !config.scan.paths || config.scan.paths.length === 0) {
    return [];
  }

  const lastScan = config.scan.last_scan_timestamp
    ? new Date(config.scan.last_scan_timestamp)
    : new Date(0);

  const newKeys = [];

  for (const scanPath of config.scan.paths) {
    try {
      const keys = await keyScanner.scanPaths([scanPath]);

      for (const key of keys) {
        // Check scan history
        const historyEntry = config.scan.scan_history?.find(
          h => h.path === key.source
        );

        if (!historyEntry || new Date(historyEntry.mtime) > lastScan) {
          newKeys.push(key);
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`  ⚠️  Couldn't scan ${scanPath}: ${error.message}`));
    }
  }

  return keyScanner._deduplicateKeys(newKeys);
}

module.exports = {
  importKeysToVault,
  quickScanForNewKeys
};
