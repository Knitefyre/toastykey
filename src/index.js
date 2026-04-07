const defaultConfig = require('./config');
const Database = require('./db');
const KeyVault = require('./vault');
const PricingEngine = require('./tracker/pricing');
const ProxyServer = require('./proxy');
const ToastyKeyMCP = require('./mcp');
const { printBanner, logSuccess, logError, logInfo } = require('./utils/banner');

async function main(config = {}) {
  try {
    // Apply config overrides
    if (config.skipBanner) {
      // Skip banner
    } else {
      printBanner(config.port ? { ...config, proxy: { port: config.port } } : config);
    }

    logInfo('Initializing ToastyKey...');

    const dbPath = config.databasePath || config.database?.path || defaultConfig.database.path;
    const db = new Database(dbPath);
    await db.ready;
    logSuccess('Database ready');

    const vault = new KeyVault(db, config.vault?.machineId || config.machineId || defaultConfig.vault.machineId);
    logSuccess('Key vault initialized');

    const pricing = new PricingEngine(
      config.pricing?.directory || defaultConfig.pricing.directory,
      config.pricing?.inrRate || defaultConfig.pricing.inrRate
    );
    logSuccess(`Pricing engine loaded (${pricing.getSupportedProviders().join(', ')})`);

    const mode = config.mode || process.argv[2];

    if (mode === 'mcp') {
      logInfo('Starting in MCP mode...');
      const mcpServer = new ToastyKeyMCP(db, vault, pricing);
      await mcpServer.run();
    } else {
      logInfo('Starting proxy server...');
      const port = config.port || config.proxy?.port || config.preferences?.port || defaultConfig.proxy.port;
      const proxyServer = new ProxyServer(db, vault, pricing, port);

      // Pass ProjectWatcher if provided
      if (config.projectWatcher) {
        proxyServer.projectWatcher = config.projectWatcher;
      }

      await proxyServer.start();
      logSuccess('ToastyKey is ready!');

      // Start project watcher if provided
      if (config.projectWatcher && config.watch?.enabled) {
        await config.projectWatcher.start(config.watch.directories);
      }

      if (!config.skipBanner) {
        console.log('\n💡 Quick start:');
        console.log('   1. Add API keys:');
        console.log(`      POST http://localhost:${port}/vault/add`);
        console.log('      { "provider": "openai", "label": "default", "key": "sk-..." }');
        console.log('');
        console.log('   2. Proxy your API calls:');
        console.log(`      http://localhost:${port}/openai/v1/chat/completions`);
        console.log(`      http://localhost:${port}/anthropic/v1/messages`);
        console.log('');
        console.log('   3. Check your spending:');
        console.log(`      GET http://localhost:${port}/stats`);
        console.log('');
      }

      process.on('SIGINT', async () => {
        console.log('\n\nShutting down ToastyKey...');
        await proxyServer.stop();
        if (config.projectWatcher) {
          await config.projectWatcher.stop();
        }
        db.close();
        logSuccess('Goodbye! 👋');
        process.exit(0);
      });
    }

  } catch (error) {
    logError(`Failed to start: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Export main for use by bin/toastykey.js
module.exports = { main };

// Only run if called directly
if (require.main === module) {
  main();
}
