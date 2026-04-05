#!/bin/bash
# Vault API curl test script
# Usage: ./test-vault-curl.sh

BASE_URL="http://localhost:4000"

echo "🧪 Testing Vault API with curl"
echo "================================"
echo ""

# Test 1: Health check
echo "1. Health check:"
curl -s "${BASE_URL}/api/health" | jq '.'
echo ""

# Test 2: List keys
echo "2. List all keys (GET /api/vault/keys):"
curl -s "${BASE_URL}/api/vault/keys" | jq '.'
echo ""

# Test 3: Add a key
echo "3. Add a new key (POST /api/vault/keys):"
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/vault/keys" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "label": "test-key",
    "key": "sk-test-1234567890abcdef"
  }')
echo "$RESPONSE" | jq '.'
KEY_ID=$(echo "$RESPONSE" | jq -r '.key_id')
echo ""

# Test 4: List keys again
echo "4. List keys again (verify added):"
curl -s "${BASE_URL}/api/vault/keys" | jq '.'
echo ""

# Test 5: Reveal key
echo "5. Reveal key (POST /api/vault/keys/${KEY_ID}/reveal):"
curl -s -X POST "${BASE_URL}/api/vault/keys/${KEY_ID}/reveal" | jq '.'
echo ""

# Test 6: Import from env
echo "6. Import from environment variables (POST /api/vault/import-env):"
curl -s -X POST "${BASE_URL}/api/vault/import-env" \
  -H "Content-Type: application/json" \
  -d '{
    "envVars": {
      "ANTHROPIC_API_KEY": "sk-ant-test-1234567890",
      "GOOGLE_AI_API_KEY": "AIzaSy-test-1234567890"
    }
  }' | jq '.'
echo ""

# Test 7: Delete key
echo "7. Delete key (DELETE /api/vault/keys/${KEY_ID}):"
curl -s -X DELETE "${BASE_URL}/api/vault/keys/${KEY_ID}" | jq '.'
echo ""

# Test 8: List keys final
echo "8. List keys (verify deleted):"
curl -s "${BASE_URL}/api/vault/keys" | jq '.'
echo ""

echo "✅ Tests completed!"
