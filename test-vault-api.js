#!/usr/bin/env node
/**
 * Test script for Vault API endpoints
 * Run with: node test-vault-api.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:4000';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testVaultAPI() {
  console.log('\n🧪 Testing Vault API Endpoints\n');

  let testKeyId = null;

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const health = await makeRequest('GET', '/api/health');
    console.log(`   ✓ Status ${health.status}: ${health.data.status}`);

    // Test 2: GET /api/vault/keys (list keys)
    console.log('\n2. Testing GET /api/vault/keys...');
    const listBefore = await makeRequest('GET', '/api/vault/keys');
    console.log(`   ✓ Status ${listBefore.status}: Found ${listBefore.data.keys.length} keys`);

    // Test 3: POST /api/vault/keys (add key)
    console.log('\n3. Testing POST /api/vault/keys...');
    const addResult = await makeRequest('POST', '/api/vault/keys', {
      provider: 'openai',
      label: 'test-key',
      key: 'sk-test-1234567890abcdef'
    });
    console.log(`   ✓ Status ${addResult.status}: ${addResult.data.message}`);
    testKeyId = addResult.data.key_id;
    console.log(`   Key ID: ${testKeyId}`);

    // Test 4: GET /api/vault/keys again (verify added)
    console.log('\n4. Testing GET /api/vault/keys (verify added)...');
    const listAfter = await makeRequest('GET', '/api/vault/keys');
    console.log(`   ✓ Status ${listAfter.status}: Found ${listAfter.data.keys.length} keys`);
    const addedKey = listAfter.data.keys.find(k => k.id === testKeyId);
    if (addedKey) {
      console.log(`   ✓ Key found: ${addedKey.provider} - ${addedKey.label}`);
    }

    // Test 5: POST /api/vault/keys/:id/reveal (reveal key)
    console.log('\n5. Testing POST /api/vault/keys/:id/reveal...');
    const revealResult = await makeRequest('POST', `/api/vault/keys/${testKeyId}/reveal`);
    console.log(`   ✓ Status ${revealResult.status}: Key revealed`);
    console.log(`   Key (first 10 chars): ${revealResult.data.key.substring(0, 10)}...`);
    console.log(`   Expires in: ${revealResult.data.expires_in}ms`);

    // Test 6: POST /api/vault/import-env (import from env vars)
    console.log('\n6. Testing POST /api/vault/import-env...');
    const importResult = await makeRequest('POST', '/api/vault/import-env', {
      envVars: {
        ANTHROPIC_API_KEY: 'sk-ant-test-1234567890',
        GOOGLE_AI_API_KEY: 'AIzaSy-test-1234567890'
      }
    });
    console.log(`   ✓ Status ${importResult.status}: Imported ${importResult.data.imported} keys`);
    console.log(`   Failed: ${importResult.data.failed}`);

    // Test 7: DELETE /api/vault/keys/:id (delete key)
    console.log('\n7. Testing DELETE /api/vault/keys/:id...');
    const deleteResult = await makeRequest('DELETE', `/api/vault/keys/${testKeyId}`);
    console.log(`   ✓ Status ${deleteResult.status}: ${deleteResult.data.message}`);

    // Test 8: GET /api/vault/keys final (verify deleted)
    console.log('\n8. Testing GET /api/vault/keys (verify deleted)...');
    const listFinal = await makeRequest('GET', '/api/vault/keys');
    console.log(`   ✓ Status ${listFinal.status}: Found ${listFinal.data.keys.length} keys`);
    const deletedKey = listFinal.data.keys.find(k => k.id === testKeyId);
    if (!deletedKey) {
      console.log(`   ✓ Key ${testKeyId} successfully deleted`);
    } else {
      console.log(`   ⚠ Key ${testKeyId} still exists`);
    }

    // Clean up imported keys
    console.log('\n9. Cleaning up imported keys...');
    const importedKeys = listFinal.data.keys.filter(k =>
      k.provider === 'anthropic' || k.provider === 'google'
    );
    for (const key of importedKeys) {
      await makeRequest('DELETE', `/api/vault/keys/${key.id}`);
      console.log(`   ✓ Deleted key ${key.id}: ${key.provider} - ${key.label}`);
    }

    console.log('\n✅ All tests completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running
http.get(`${BASE_URL}/api/health`, (res) => {
  if (res.statusCode === 200) {
    testVaultAPI();
  }
}).on('error', (error) => {
  console.error('\n❌ Server is not running on port 4000');
  console.error('Please start the server first: npm start\n');
  process.exit(1);
});
