# Vault API Testing

This document describes how to test the Vault API endpoints.

## Endpoints

The Vault API provides the following endpoints:

### 1. GET /api/vault/keys
List all stored API keys (metadata only, no decrypted values).

**Response:**
```json
{
  "keys": [
    {
      "id": 1,
      "provider": "openai",
      "label": "default",
      "created_at": "2024-01-01T00:00:00Z",
      "last_used": "2024-01-01T00:00:00Z",
      "status": "active",
      "total_cost": 0.0
    }
  ]
}
```

### 2. POST /api/vault/keys
Add a new API key to the vault.

**Request:**
```json
{
  "provider": "openai",
  "label": "my-api-key",
  "key": "sk-..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Key added for openai (my-api-key)",
  "key_id": 1
}
```

### 3. DELETE /api/vault/keys/:id
Delete an API key by ID.

**Response:**
```json
{
  "success": true,
  "message": "Key 1 deleted successfully"
}
```

### 4. POST /api/vault/keys/:id/reveal
Reveal a decrypted API key (for 10 seconds in the UI).

**Response:**
```json
{
  "success": true,
  "key": "sk-...",
  "expires_in": 10000
}
```

### 5. POST /api/vault/import-env
Import API keys from environment variables.

**Request:**
```json
{
  "envVars": {
    "OPENAI_API_KEY": "sk-...",
    "ANTHROPIC_API_KEY": "sk-ant-..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "imported": 2,
  "failed": 0,
  "details": {
    "success": [...],
    "failed": [...]
  }
}
```

## Testing

### Prerequisites
1. Start the ToastyKey server:
   ```bash
   npm start
   ```

2. The server should be running on `http://localhost:4000`

### Automated Testing

#### Node.js Test Script
Run the comprehensive test suite:
```bash
node test-vault-api.js
```

This will:
- Test all 5 vault endpoints
- Verify CRUD operations
- Clean up test data

#### Curl Test Script
Run manual curl tests:
```bash
chmod +x test-vault-curl.sh
./test-vault-curl.sh
```

Requires `jq` for JSON formatting:
```bash
brew install jq  # macOS
```

### Manual Testing with curl

```bash
# List keys
curl http://localhost:4000/api/vault/keys

# Add a key
curl -X POST http://localhost:4000/api/vault/keys \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","label":"test","key":"sk-test-123"}'

# Reveal key
curl -X POST http://localhost:4000/api/vault/keys/1/reveal

# Delete key
curl -X DELETE http://localhost:4000/api/vault/keys/1

# Import from env
curl -X POST http://localhost:4000/api/vault/import-env \
  -H "Content-Type: application/json" \
  -d '{"envVars":{"OPENAI_API_KEY":"sk-test-123"}}'
```

## WebSocket Events

The Vault API emits WebSocket events for real-time updates:

- `vault_update` with action `added` when a key is added
- `vault_update` with action `deleted` when a key is deleted

Event format:
```json
{
  "action": "added",
  "provider": "openai",
  "label": "my-key",
  "key_id": 1
}
```

## Security Notes

- All keys are encrypted with AES-256-GCM before storage
- The master key is derived from the machine ID using scrypt
- Keys are never exposed in logs or error messages
- The reveal endpoint is designed for temporary UI display only (10 seconds)
