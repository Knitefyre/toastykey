#!/usr/bin/env node

/**
 * Manual Anthropic Proxy Test Script
 *
 * Usage:
 *   node tests/manual-anthropic-test.js setup    - Add Anthropic API key to vault
 *   node tests/manual-anthropic-test.js test     - Test the proxy with a simple API call
 */

const readline = require('readline');
const axios = require('axios');
const path = require('path');

// ToastyKey imports
const ToastyKeyDB = require('../src/db');
const KeyVault = require('../src/vault');
const PricingEngine = require('../src/tracker/pricing');

const DB_PATH = path.join(__dirname, '..', 'toastykey.db');
const PRICING_DIR = path.join(__dirname, '..', 'pricing');
const PROXY_URL = 'http://localhost:4000';

// Generate a simple machine ID for testing
const MACHINE_ID = 'test-machine-' + require('os').hostname();

/**
 * Prompt user for input
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Setup command - Add Anthropic API key to vault
 */
async function setup() {
  console.log('\n=== ToastyKey Anthropic Setup ===\n');
  console.log('This will store your Anthropic API key securely in the vault.');
  console.log('The key will be encrypted using AES-256-GCM.\n');

  const apiKey = await prompt('Enter your Anthropic API key: ');

  if (!apiKey || !apiKey.trim()) {
    console.error('\nError: API key cannot be empty');
    process.exit(1);
  }

  try {
    // Initialize database and vault
    const db = new ToastyKeyDB(DB_PATH);
    await db.ready;

    const vault = new KeyVault(db, MACHINE_ID);

    // Add key to vault
    const result = await vault.addKey('anthropic', 'default', apiKey.trim());

    if (result.success) {
      console.log('\n✓ Anthropic API key stored successfully!');
      console.log(`  Key ID: ${result.id}`);
      console.log('\nYou can now run: node tests/manual-anthropic-test.js test\n');
    } else {
      console.error('\n✗ Failed to store API key:', result.error);
      process.exit(1);
    }

    await db.close();
  } catch (error) {
    console.error('\n✗ Setup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Test command - Make a test API call through the proxy
 */
async function test() {
  console.log('\n=== ToastyKey Anthropic Proxy Test ===\n');

  try {
    // Check if proxy is running
    console.log('1. Checking if proxy is running...');
    try {
      const healthCheck = await axios.get(`${PROXY_URL}/health`, { timeout: 2000 });
      console.log('   ✓ Proxy is running');
      console.log(`   Service: ${healthCheck.data.service}`);
      console.log(`   Version: ${healthCheck.data.version}\n`);
    } catch (error) {
      console.error('   ✗ Proxy is not running!');
      console.error('   Please start the proxy first: node src/index.js\n');
      process.exit(1);
    }

    // Make a test API call through the proxy
    console.log('2. Making test API call through proxy...');
    console.log('   Endpoint: /v1/messages');
    console.log('   Model: claude-haiku-4-20250323');
    console.log('   Prompt: "Say hello in 5 words"\n');

    const startTime = Date.now();

    const response = await axios.post(
      `${PROXY_URL}/anthropic/v1/messages`,
      {
        model: 'claude-haiku-4-20250323',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say hello in 5 words'
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-ToastyKey-Project': 'manual-test'
        }
      }
    );

    const latency = Date.now() - startTime;

    console.log('   ✓ API call successful!\n');

    // Display response
    console.log('=== Response ===');
    console.log(`Status: ${response.status}`);
    console.log(`Latency: ${latency}ms`);
    console.log(`Model: ${response.data.model}`);

    if (response.data.content && response.data.content.length > 0) {
      const message = response.data.content[0];
      console.log(`\nAssistant: ${message.text}`);
    }

    // Display usage
    if (response.data.usage) {
      console.log('\n=== Token Usage ===');
      console.log(`Input tokens: ${response.data.usage.input_tokens}`);
      console.log(`Output tokens: ${response.data.usage.output_tokens}`);
    }

    // Query database for the logged call
    console.log('\n3. Checking database logs...');

    const db = new ToastyKeyDB(DB_PATH);
    await db.ready;

    const recentCalls = await db.getApiCalls({
      provider: 'anthropic',
      project: 'manual-test',
      limit: 1
    });

    if (recentCalls.length > 0) {
      const call = recentCalls[0];
      console.log('   ✓ API call logged successfully!\n');

      console.log('=== Database Record ===');
      console.log(`ID: ${call.id}`);
      console.log(`Provider: ${call.provider}`);
      console.log(`Endpoint: ${call.endpoint}`);
      console.log(`Model: ${call.model}`);
      console.log(`Status: ${call.status}`);
      console.log(`Latency: ${call.latency_ms}ms`);
      console.log(`Input tokens: ${call.input_tokens}`);
      console.log(`Output tokens: ${call.output_tokens}`);
      console.log(`Cost: $${call.cost_usd} (₹${call.cost_inr})`);
      console.log(`Timestamp: ${call.timestamp}`);
    } else {
      console.log('   ⚠ No database record found (this may indicate a logging issue)');
    }

    await db.close();

    console.log('\n=== Test Complete ===\n');
    console.log('✓ All checks passed!');
    console.log('The Anthropic proxy is working correctly.\n');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);

    if (error.response) {
      console.error('\nResponse data:', JSON.stringify(error.response.data, null, 2));
      console.error('Status:', error.response.status);
    }

    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  const command = process.argv[2];

  if (!command) {
    console.log('\nUsage:');
    console.log('  node tests/manual-anthropic-test.js setup    - Add Anthropic API key to vault');
    console.log('  node tests/manual-anthropic-test.js test     - Test the proxy with a simple API call\n');
    process.exit(1);
  }

  switch (command) {
    case 'setup':
      await setup();
      break;
    case 'test':
      await test();
      break;
    default:
      console.error(`\nUnknown command: ${command}`);
      console.log('\nValid commands: setup, test\n');
      process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});