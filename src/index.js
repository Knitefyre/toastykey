const config = require('./config');
const Database = require('./db');
const KeyVault = require('./vault');
const PricingEngine = require('./tracker/pricing');
const ProxyServer = require('./proxy');
const ToastyKeyMCP = require('./mcp');
const { printBanner, logSuccess, logError, logInfo } = require('./utils/banner');

async function main() {
  try {
    // Print branded banner
    printBanner(config);

    // Initialize core components
    logInfo('Initializing ToastyKey...');

    const db = new Database(config.database.path);
    await db.ready;
    logSuccess('Database ready');

    const vault = new KeyVault(db, config.vault.machineId);
    logSuccess('Key vault initialized');

    const pricing = new PricingEngine(config.pricing.directory, config.pricing.inrRate);
    logSuccess(`Pricing engine loaded (${pricing.getSupportedProviders().join(', ')})`);

    // Check if running in MCP mode or standalone mode
    const mode = process.argv[2];

    if (mode === 'mcp') {
      // Run as MCP server (stdio mode)
      logInfo('Starting in MCP mode...');
      const mcpServer = new ToastyKeyMCP(db, vault, pricing);
      await mcpServer.run();
    } else {
      // Run as HTTP proxy server (default)
      logInfo('Starting proxy server...');
      const proxyServer = new ProxyServer(db, vault, pricing, config.proxy.port);
      await proxyServer.start();
      logSuccess('ToastyKey is ready!');

      // Show usage hints
      console.log('\n💡 Quick start:');
      console.log('   1. Add API keys:');
      console.log('      POST http://localhost:4000/vault/add');
      console.log('      { "provider": "openai", "label": "default", "key": "sk-..." }');
      console.log('');
      console.log('   2. Proxy your API calls:');
      console.log('      http://localhost:4000/openai/v1/chat/completions');
      console.log('      http://localhost:4000/anthropic/v1/messages');
      console.log('');
      console.log('   3. Check your spending:');
      console.log('      GET http://localhost:4000/stats');
      console.log('');

      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n\nShutting down ToastyKey...');
        await proxyServer.stop();
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

// Run the application
main();
